import * as vscode from 'vscode'

export function registerStripMLineEndingsCommand (context) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.stripMLineEndings', async function () {
    const editor = vscode.window.activeTextEditor
    const activeDoc = editor?.document

    if (!activeDoc) {
      return vscode.window.showErrorMessage('Open a document first.')
    } else if (activeDoc.uri.scheme === 'output') {
      return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
    } else if (!['xml', 'markdown', 'plaintext'].includes(activeDoc.languageId)) {
      return vscode.window.showErrorMessage('Unsupported Document Type.')
    }

    const ranges = []
    for (let i = 0; i < activeDoc.lineCount; i++) {
      const text = activeDoc.lineAt(i).text
      if (text.endsWith('^4')) {
        const start = new vscode.Position(i, text.length - 2)
        const end = new vscode.Position(i, text.length)
        ranges.push(new vscode.Range(start, end))
      }
    }

    if (ranges.length === 0) {
      vscode.window.showInformationMessage('No ^4 line endings found.')
    } else {
      // delete from bottom to top to avoid shifting positions
      ranges.sort((a, b) => b.start.line - a.start.line || b.start.character - a.start.character)
      await editor.edit(editBuilder => {
        for (const range of ranges) {
          editBuilder.delete(range)
        }
      })
      vscode.window.showInformationMessage(`Stripped ${ranges.length} ^4 line ending(s).`)
    }
  }))
}
