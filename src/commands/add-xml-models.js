import * as vscode from 'vscode'
import { posix } from 'node:path'

export function registerAddXmlModelsCommand (context) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.addXmlModels', async function () {
    const editor = vscode.window.activeTextEditor
    const activeDoc = editor?.document

    if (!activeDoc) {
      return vscode.window.showErrorMessage('Open an XML document first.')
    } else if (activeDoc.uri.scheme === 'output') {
      return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
    } else if (activeDoc.languageId !== 'xml') {
      return vscode.window.showErrorMessage('Unsupported Document Type.')
    }

    // Fetch schemas

    try {
      const dirPath = posix.dirname(activeDoc.uri.toString())
      const rfc7991bisContent = await fetch('https://github.com/ietf-tools/RFCXML/raw/main/rfc7991bis.rnc')
      await vscode.workspace.fs.writeFile(vscode.Uri.parse(posix.join(dirPath, 'rfc7991bis.rnc')), new Uint8Array(await rfc7991bisContent.arrayBuffer()))
      const svg12rfcContent = await fetch('https://github.com/ietf-tools/RFCXML/raw/main/SVG-1.2-RFC.rnc')
      await vscode.workspace.fs.writeFile(vscode.Uri.parse(posix.join(dirPath, 'SVG-1.2-RFC.rnc')), new Uint8Array(await svg12rfcContent.arrayBuffer()))
    } catch (err) {
      return vscode.window.showErrorMessage(`Failed to download schemas to disk: ${err.message}`)
    }

    // Add reference to XML document

    let replaceOccured = false
    for (let i = 0; i < activeDoc.lineCount; i++) {
      const line = activeDoc.lineAt(i)
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
          new vscode.Position(activeDoc.lineAt(0).text.startsWith('<?xml ') ? 1 : 0, 0),
          '<?xml-model href="rfc7991bis.rnc"?>\n'
        )
      })
      vscode.window.showInformationMessage('Schemas downloaded and <?xml-model> added successfully.')
    }
  }))
}
