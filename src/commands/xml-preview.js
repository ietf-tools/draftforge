import * as vscode from 'vscode'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { debounce } from 'lodash-es'

const execAsync = promisify(exec)
let tmpPath = ''

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
</html>`;
}

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
</html>`;
}

class DocumentPreview {
  constructor(documentUri, fileName) {
    this.documentUri = documentUri
    this.documentFilename = path.parse(fileName).base

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
    try {
      const now = Date.now().toString()

      // Ensure panel is setup
      if (!this.panel) {
        this.setupPanel()
      }

      // Write input
      const inputPath = path.join(tmpPath, `${now}.xml`)
      await fs.writeFile(inputPath, inputContent, 'utf8')

      // Run xml2rfc
      const outputPath = path.join(tmpPath, `${now}.html`)
      const execPath = vscode.workspace.getConfiguration('draftforge.xml2rfc').get('executablePath')
      const flags = vscode.workspace.getConfiguration('draftforge.xml2rfc').get('previewFlags')
      const cmd = `${execPath} ${flags} --html -o "${outputPath}" "${inputPath}"`
      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 30000, // 30s
        windowsHide: true
      })
      // console.log('OUT:')
      // console.log(stdout)
      // console.log('ERR:')
      // console.log(stderr)
      this.panel.webview.html = await fs.readFile(outputPath, 'utf8')
      fs.rm(inputPath, { force: true })
      fs.rm(outputPath, { force: true })
    } catch (err) {
      console.warn(err)
      this.panel.webview.html = getErrorContent(err.message)
    }
    this.panel.reveal(null, true)
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function registerXmlPreviewCommand (context) {
  let previews = {}

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.xmlPreview', async function () {
    try {
      const activeDoc = vscode.window.activeTextEditor.document
      if (!activeDoc || activeDoc.languageId !== 'xml') {
        return vscode.window.showErrorMessage('Open or select an XML document first.')
      }

      const activeUri = activeDoc.uri.toString()
      if (!previews[activeUri]) {
        previews[activeUri] = new DocumentPreview(activeUri, activeDoc.fileName)
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

export function unregisterXmlPreviewCommand (context) {
  if (tmpPath) {
    console.log(`Cleaning up ${tmpPath}...`)
    fs.rm(tmpPath, { recursive: true, force: true })
  }
}
