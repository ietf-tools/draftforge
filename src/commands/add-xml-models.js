import * as vscode from 'vscode'
import { posix } from 'node:path'

export function registerAddXmlModelsCommand (context) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.addXmlModels', async function () {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      return vscode.window.showInformationMessage('Open an XML document first.')
    }

    const doc = editor.document

    // Fetch schemas

    try {
      const dirPath = posix.dirname(editor.document.uri.toString())
      const rfc7991bisContent = await fetch('https://github.com/ietf-tools/RFCXML/raw/main/rfc7991bis.rnc')
      await vscode.workspace.fs.writeFile(vscode.Uri.parse(posix.join(dirPath, 'rfc7991bis.rnc')), new Uint8Array(await rfc7991bisContent.arrayBuffer()))
      const svg12rfcContent = await fetch('https://github.com/ietf-tools/RFCXML/raw/main/SVG-1.2-RFC.rnc')
      await vscode.workspace.fs.writeFile(vscode.Uri.parse(posix.join(dirPath, 'SVG-1.2-RFC.rnc')), new Uint8Array(await svg12rfcContent.arrayBuffer()))
    } catch (err) {
      return vscode.window.showErrorMessage(`Failed to download schemas to disk: ${err.message}`)
    }

    // Add reference to XML document

    let replaceOccured = false
    for (let i = 0; i < doc.lineCount; i++) {
      const line = doc.lineAt(i)
      if (line.text.startsWith('<?xml-model')) {
        await editor.edit(editBuilder => {
          editBuilder.replace(line.range, '<?xml-model href="rfc7991bis.rnc"?>')
        })
        replaceOccured = true
      }
    }

    if (replaceOccured) {
      vscode.window.showInformationMessage('Schemas downloaded and existing <?xml-model> updated successfully.')
    } else {
      await editor.edit(editBuilder => {
        editBuilder.insert(
          new vscode.Position(doc.lineAt(0).text.startsWith('<?xml ') ? 1 : 0, 0),
          '<?xml-model href="rfc7991bis.rnc"?>\n'
        )
      })
      vscode.window.showInformationMessage('Schemas downloaded and <?xml-model> added successfully.')
    }
  }))
}