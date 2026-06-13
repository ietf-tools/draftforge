import * as vscode from 'vscode'
import { dedent } from '../helpers/text.js'

/**
 * @param {vscode.ExtensionContext} context
 * @param outputView
 */
export function registerExtractCommentsCommand(context, outputView) {
  context.subscriptions.push(
    vscode.commands.registerCommand('draftforge.extractComments', async function () {
      const activeDoc = vscode.window.activeTextEditor?.document

      if (!activeDoc) {
        return vscode.window.showErrorMessage('Open a document first.')
      } else if (activeDoc.uri.scheme === 'output') {
        return vscode.window.showErrorMessage(
          'Focus your desired document first. Focus is currently in the Output window.'
        )
      } else if (!['xml', 'markdown'].includes(activeDoc.languageId)) {
        return vscode.window.showErrorMessage('Unsupported Document Type.')
      }

      const commentsRgx = /<!--\s?\[rfced\]([^]+?)-->/gim
      const contents = activeDoc.getText()

      outputView.clear()
      let idx = 0
      const outputLines = []

      for (const match of contents.matchAll(commentsRgx)) {
        idx++
        outputLines.push(`${idx}. ${dedent(match[1]).trim()}`)
      }

      if (idx === 0) {
        outputView.appendLine('No [rfced] mentions found.')
        vscode.window.showInformationMessage('No [rfced] mentions found.')
      } else {
        outputLines.unshift(`Authors,

While reviewing this document during Final Review, please resolve
(as necessary) the following questions, which are also in the source file.`)
        outputView.appendLine(outputLines.join('\n\n\n'))
        vscode.window.showInformationMessage(
          `Found ${idx} [rfced] mention(s). See Output: DraftForge`
        )
      }

      outputView.reveal()
    })
  )
}
