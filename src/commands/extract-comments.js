import * as vscode from 'vscode'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.OutputChannel} outputChannel
 */
export function registerExtractCommentsCommand (context, outputChannel) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.extractComments', async function () {
    const activeDoc = vscode.window.activeTextEditor?.document

    if (!activeDoc) {
      return vscode.window.showErrorMessage('Open a document first.')
    } else if (activeDoc.uri.scheme === 'output') {
      return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
    } else if (!['xml', 'markdown'].includes(activeDoc.languageId)) {
      return vscode.window.showErrorMessage('Unsupported Document Type.')
    }

    const commentsRgx = /<!-- \[rfced\]([^]+?)-->/gmi
    const contents = activeDoc.getText()

    outputChannel.clear()
    outputChannel.appendLine(`List of comments for the RPC staff in ${activeDoc.fileName}:\n`)
    let idx = 0

    for (const match of contents.matchAll(commentsRgx)) {
      if (idx > 0) {
        outputChannel.appendLine('\n--------\n')
      }
      idx++
      outputChannel.appendLine(`${idx}. ${match[1].trim()}`)
    }

    if (idx === 0) {
      outputChannel.appendLine('No [rfced] mentions found.')
      vscode.window.showInformationMessage('No [rfced] mentions found.')
    } else {
      vscode.window.showInformationMessage(`Found ${idx} [rfced] mention(s). See Output: DraftForge`)
    }

    outputChannel.show(true)
  }))
}
