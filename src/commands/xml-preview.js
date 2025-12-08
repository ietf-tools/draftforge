import * as vscode from 'vscode'
import path from 'node:path'

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

/**
 * @param {vscode.ExtensionContext} context
 */
export function registerXmlShowPreviewCommand (context) {
  let previewPanels = {}

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.xmlShowPreview', async function () {
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

      // Show preview

      if (true) {
        previewPanels[activeUri].reveal()
      } else {
        vscode.window.showInformationMessage('idnits', {
          detail: 'No nits found on this document.',
          modal: true
        })
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
