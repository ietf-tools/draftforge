import * as vscode from 'vscode'
import { parse } from 'node:path'

export function registerSurroundBcp14KeywordsCommand(context, outputView) {
  context.subscriptions.push(
    vscode.commands.registerCommand('draftforge.surroundBcp14Keywords', async function () {
      const editor = vscode.window.activeTextEditor
      const activeDoc = editor?.document

      if (!activeDoc) {
        return vscode.window.showErrorMessage('Open a document first.')
      } else if (activeDoc.uri.scheme === 'output') {
        return vscode.window.showErrorMessage(
          'Focus your desired document first. Focus is currently in the Output window.'
        )
      } else if (!['xml', 'markdown'].includes(activeDoc.languageId)) {
        return vscode.window.showErrorMessage('Unsupported Document Type.')
      }

      const text = activeDoc.getText()

      const matchRgx =
        /<bcp14>[\s\S]*?<\/bcp14>|(?<term>MUST\sNOT|MUST|SHOULD\sNOT|SHOULD|SHALL\sNOT|SHALL|RECOMMENDED|NOT\sRECOMMENDED|MAY|OPTIONAL|REQUIRED)/g
      const artworkRgx = /<artwork[^>]*>[\s\S]*?<\/artwork>/g
      const sourcecodeRgx = /<sourcecode[^>]*>[\s\S]*?<\/sourcecode>/g
      const excludedRanges = []
      const keywordsReplaces = []
      let match

      // List all artwork blocks first to exclude them
      while ((match = artworkRgx.exec(text)) !== null) {
        excludedRanges.push(
          new vscode.Range(
            activeDoc.positionAt(match.index),
            activeDoc.positionAt(match.index + match[0].length)
          )
        )
      }

      // List all sourcecode blocks first to exclude them
      while ((match = sourcecodeRgx.exec(text)) !== null) {
        excludedRanges.push(
          new vscode.Range(
            activeDoc.positionAt(match.index),
            activeDoc.positionAt(match.index + match[0].length)
          )
        )
      }

      // Match all BCP 14 keywords
      while ((match = matchRgx.exec(text)) !== null) {
        if (match.groups?.term) {
          const term = match.groups.term
          const startPos = activeDoc.positionAt(match.index)
          const endPos = activeDoc.positionAt(match.index + match[0].length)

          // -> Ensure it's not within a sourcecode block range
          if (excludedRanges.some((rg) => rg.contains(startPos))) {
            continue
          }

          // -> Add to replaces
          keywordsReplaces.push({
            range: new vscode.Range(startPos, endPos),
            term: term
          })
        }
      }

      const fileName = parse(activeDoc.fileName).base
      outputView.clear()
      outputView.setFileUri(activeDoc.uri)

      if (keywordsReplaces.length === 0) {
        vscode.window.showInformationMessage('No BCP 14 keywords to enclose found.')
        outputView.appendHeader(`No BCP 14 keywords to enclose found in ${fileName}.`)
      } else {
        await editor.edit((editBuilder) => {
          // replace from bottom to top to avoid shifting positions
          for (const replace of keywordsReplaces.reverse()) {
            editBuilder.replace(replace.range, `<bcp14>${replace.term}</bcp14>`)
          }
        })
        vscode.window.showInformationMessage(
          `Surrounded ${keywordsReplaces.length} BCP 14 keywords.`
        )

        outputView.appendHeader(`BCP 14 keywords surrounded in ${fileName}:`)
        for (const replace of keywordsReplaces) {
          outputView.appendLineWithRanges({
            text: `- ${replace.term}`,
            ranges: [
              {
                startLine: replace.range.start.line,
                startCharacter: replace.range.start.character,
                endLine: replace.range.end.line,
                endCharacter: replace.range.end.character + 15,
                label: `${replace.range.start.line}:${replace.range.start.character}`
              }
            ]
          })
        }
      }

      outputView.reveal()
    })
  )
}
