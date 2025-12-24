import * as vscode from 'vscode'

export function registerSurroundBcp14KeywordsCommand (context) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.surroundBcp14Keywords', async function () {
    const editor = vscode.window.activeTextEditor
    const activeDoc = editor?.document

    if (!activeDoc) {
      return vscode.window.showErrorMessage('Open a document first.')
    } else if (activeDoc.uri.scheme === 'output') {
      return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
    } else if (!['xml', 'markdown'].includes(activeDoc.languageId)) {
      return vscode.window.showErrorMessage('Unsupported Document Type.')
    }

    const text = activeDoc.getText()

    const matchRgx = /<bcp14>[\s\S]*?<\/bcp14>|(?<term>MUST\sNOT|MUST|SHOULD\sNOT|SHOULD|SHALL\sNOT|SHALL|RECOMMENDED|NOT\sRECOMMENDED|MAY|OPTIONAL|REQUIRED)/g
    const sourcecodeRgx = /<sourcecode[^>]*>[\s\S]*?<\/sourcecode>/g
    const sourcecodeRanges = []
    const keywordsReplaces = []
    let match

    // List all sourcecode blocks first to exclude them
    while ((match = sourcecodeRgx.exec(text)) !== null) {
      sourcecodeRanges.push(new vscode.Range(activeDoc.positionAt(match.index), activeDoc.positionAt(match.index + match[0].length)))
    }

    // Match all BCP 14 keywords
    while ((match = matchRgx.exec(text)) !== null) {
      if (match.groups?.term) {
        const term = match.groups.term
        const startPos = activeDoc.positionAt(match.index)
        const endPos = activeDoc.positionAt(match.index + match[0].length)

        // -> Ensure it's not within a sourcecode block range
        if (sourcecodeRanges.some(rg => rg.contains(startPos))) {
          continue
        }

        // -> Add to replaces
        keywordsReplaces.push({
          range: new vscode.Range(startPos, endPos),
          term: term
        })
      }
    }

    if (keywordsReplaces.length === 0) {
      vscode.window.showInformationMessage('No BCP 14 keywords to enclose found.')
    } else {
      await editor.edit(editBuilder => {
        // replace from bottom to top to avoid shifting positions
        for (const replace of keywordsReplaces.reverse()) {
          editBuilder.replace(replace.range, `<bcp14>${replace.term}</bcp14>`)
        }
      })
      vscode.window.showInformationMessage(`Surrounded ${keywordsReplaces.length} BCP 14 keywords.`)
    }
  }))
}
