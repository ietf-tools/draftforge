import * as vscode from 'vscode'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'

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
  <div>Loading...</div>
</body>
</html>`;
}

async function run (inputContent) {
  try {
    // Get temp dir
    if (!tmpPath) {
      tmpPath = await fs.mkdtemp(path.join(tmpdir(), 'draftforge-'))
      console.log(tmpPath)
    }
    const now = Date.now().toString()

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
    console.log('OUT:')
    console.log(stdout)
    console.log('ERR:')
    console.log(stderr)
    const outputContent = await fs.readFile(outputPath, 'utf8')
    return outputContent
  } catch (err) {
    console.warn(err)
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function registerXmlPreviewCommand (context) {
  let previewPanels = {}

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.xmlPreview', async function () {
    try {
      const activeDoc = vscode.window.activeTextEditor.document
      const activeUri = activeDoc.uri.toString()
      const activeFilename = path.parse(activeDoc.fileName).base

      // Setup webview

      if (!previewPanels[activeUri]) {
        previewPanels[activeUri] = vscode.window.createWebviewPanel(
          'xml2rfcPreview',
          `Preview - ${activeFilename}`,
          vscode.ViewColumn.Two,
          {
            enableScripts: false,
            retainContextWhenHidden: true
          }
        )

        previewPanels[activeUri].onDidDispose(() => {
          previewPanels[activeUri] = null
        })
      }

      previewPanels[activeUri].webview.html = getLoadingContent()
      previewPanels[activeUri].reveal()

      // Show preview

      const output = await run(activeDoc.getText())

      if (output) {
        previewPanels[activeUri].webview.html = output
      } else {
        vscode.window.showErrorMessage('Failed to render XMLRFC preview.')
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}

export function unregisterXmlPreviewCommand (context) {
  if (tmpPath) {
    console.log(`Cleaning up ${tmpPath}...`)
    fs.rm(tmpPath, { recursive: true, force: true })
  }
}
