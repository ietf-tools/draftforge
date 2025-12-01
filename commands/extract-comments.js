import * as vscode from 'vscode'

export function registerExtractCommentsCommand (context) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.extractComments', async function () {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      return vscode.window.showInformationMessage('Open an XML document first.')
    }

    const doc = editor.document

    const commentsRgx = /<!-- \[rfced\]([^]+?)-->/gmi
    const contents = doc.getText()

    const output = vscode.window.createOutputChannel('DraftForge')
    output.clear()
    output.appendLine(`List of comments for the RPC staff in ${doc.fileName}:\n`)
    let idx = 0

    for (const match of contents.matchAll(commentsRgx)) {
      if (idx > 0) {
        output.appendLine('\n--------\n')
      }
      idx++
      output.appendLine(`${idx}. ${match[1].trim()}`)
    }

    if (idx === 0) {
      output.appendLine('No [rfced] mentions found.')
      vscode.window.showInformationMessage('No [rfced] mentions found.')
    } else {
      vscode.window.showInformationMessage(`Found ${idx} [rfced] mention(s). See Output: DraftForge`)
    }

    output.show(true)
  }))
}