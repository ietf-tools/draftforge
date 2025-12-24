import * as vscode from 'vscode'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { debounce } from 'lodash-es'

const execAsync = promisify(exec)
let tmpPath = ''

/**
 * Get loading template
 * @returns {String}
 */
function getLoadingContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XML2RFC</title>
</head>
<body>
  <div>Rendering preview...</div>
</body>
</html>`
}

/**
 * Get error template
 * @param {String} errorMsg
 * @returns {String}
 */
function getErrorContent(errorMsg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XML2RFC</title>
</head>
<body>
  <div style="padding: 15px 0; font-size: 1.2rem;"><strong>Failed to render preview</strong></div>
  <div>${errorMsg.replaceAll("\n", '<br>')}</div>
</body>
</html>`
}

class DocumentPreview {
  /**
   *
   * @param {vscode.Uri} documentUri
   * @param {string} fileName
   * @param {vscode.OutputChannel} outputChannel
   */
  constructor(documentUri, fileName, outputChannel) {
    this.documentUri = documentUri
    this.documentFilename = path.parse(fileName).base
    this.outputChannel = outputChannel

    this.setupPanel()
    this.generateDebounced = debounce(this.generate, 500)
  }

  /**
   * Initialize Webview Panel
   */
  setupPanel () {
    this.panel = vscode.window.createWebviewPanel(
      'xml2rfcPreview',
      `Preview - ${this.documentFilename}`,
      vscode.ViewColumn.Two,
      {
        enableScripts: false,
        retainContextWhenHidden: true
      }
    )

    this.panel.onDidDispose(() => {
      this.panel = null
    })

    this.panel.webview.html = getLoadingContent()
    this.panel.reveal()
  }

  /**
   * Generate preview from input content
   *
   * @param {string} inputContent Content to transform
   */
  async generate (inputContent) {
    const now = Date.now().toString()
    const inputPath = path.join(tmpPath, `${now}.xml`)
    try {
      // Ensure panel is setup
      if (!this.panel) {
        this.setupPanel()
      }

      // Write input
      await fs.writeFile(inputPath, inputContent, 'utf8')

      // Run xml2rfc
      const outputPath = path.join(tmpPath, `${now}.html`)
      const execPath = vscode.workspace.getConfiguration('draftforge.xml2rfc').get('executablePath')
      const flags = vscode.workspace.getConfiguration('draftforge.xml2rfc').get('previewFlags')
      const cmd = `${execPath} ${flags} --html -o "${outputPath}" "${inputPath}"`
      const { stderr } = await execAsync(cmd, {
        timeout: 30000, // 30s
        windowsHide: true
      })
      this.parseOutput(stderr)
      this.panel.webview.html = await fs.readFile(outputPath, 'utf8')
      fs.rm(outputPath, { force: true })
    } catch (err) {
      console.warn(err)
      this.panel.webview.html = getErrorContent(err.message)
    }
    this.panel.reveal(null, true)
    fs.rm(inputPath, { force: true })
  }

  /**
   * Parse xml2rfc output
   *
   * @param {string} stderr xml2rfc stderr output
   */
  parseOutput (stderr) {
    const diagRgx = /(.xml\((?<line>[0-9]+)\): )?(?<kind>Warning|Error): (?<msg>.*)/i
    this.outputChannel.clear()
    for(const line of stderr.split('\n')) {
      const match = line.match(diagRgx)
      if (match) {
        const lineParts = [match.groups.kind]
        if (match.groups.line) {
          lineParts.push(`Line ${match.groups.line}`)
        }
        lineParts.push(match.groups.msg)
        this.outputChannel.appendLine(lineParts.join(' - '))
      }
    }
    this.outputChannel.show(true)
  }
}

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.OutputChannel} outputChannel
 */
export function registerXmlPreviewCommand (context, outputChannel) {
  let previews = {}

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.xmlPreview', async function () {
    try {
      const activeDoc = vscode.window.activeTextEditor?.document

      if (!activeDoc) {
        return vscode.window.showErrorMessage('Open a document first.')
      } else if (activeDoc.uri.scheme === 'output') {
        return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
      } else if (activeDoc.languageId !== 'xml') {
        return vscode.window.showErrorMessage('Unsupported Document Type.')
      }

      const activeUri = activeDoc.uri.toString()
      if (!previews[activeUri]) {
        previews[activeUri] = new DocumentPreview(activeDoc.uri, activeDoc.fileName, outputChannel)
      }

      // Get temp dir
      if (!tmpPath) {
        tmpPath = await fs.mkdtemp(path.join(tmpdir(), 'draftforge-'))
      }

      // Show preview
      await previews[activeUri].generate(activeDoc.getText())
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))

  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (ev) => {
    const activeUri = ev.document.uri.toString()
    if (previews[activeUri]) {
      await previews[activeUri].generateDebounced(ev.document.getText())
    }
  }))
}

export function unregisterXmlPreviewCommand () {
  if (tmpPath) {
    console.log(`Cleaning up ${tmpPath}...`)
    fs.rm(tmpPath, { recursive: true, force: true })
    tmpPath = ''
  }
}
