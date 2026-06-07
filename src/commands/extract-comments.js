import * as vscode from 'vscode'
import { dedent } from '../helpers/text.js'
import { parse } from 'node:path'

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

      const fileName = parse(activeDoc.fileName).base
      outputView.clear()
      outputView.setFileUri(activeDoc.uri)
      outputView.appendHeader(`List of comments for the RPC staff in ${fileName}:`)
      let idx = 0

      for (const match of contents.matchAll(commentsRgx)) {
        if (idx > 0) {
          outputView.appendSeparator()
        }
        idx++
        const startPos = activeDoc.positionAt(match.index)
        const endPos = activeDoc.positionAt(match.index + match[0].length)
        outputView.appendLineWithRanges({
          text: `${idx}. ${dedent(match[1]).trim()}`,
          ranges: [
            {
              startLine: startPos.line,
              startCharacter: startPos.character,
              endLine: endPos.line,
              endCharacter: endPos.character,
              label:
                startPos.line !== endPos.line ? `${startPos.line}-${endPos.line}` : startPos.line
            }
          ]
        })
      }

      if (idx === 0) {
        outputView.appendLine('No [rfced] mentions found.')
        vscode.window.showInformationMessage('No [rfced] mentions found.')
      } else {
        vscode.window.showInformationMessage(
          `Found ${idx} [rfced] mention(s). See Output: DraftForge`
        )
      }

      outputView.reveal()
    })
  )
}
