import * as vscode from 'vscode'

export function registerSurroundBcp14KeywordsCommand (context) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.surroundBcp14Keywords', async function () {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      return vscode.window.showInformationMessage('Open an XML document first.')
    }

    const doc = editor.document
    if (doc.languageId !== 'xml') {
      return vscode.window.showInformationMessage('Only XML documents are supported.')
    }

    const text = doc.getText()

    const matchRgx = /<bcp14>[\s\S]*?<\/bcp14>|(?<term>MUST\sNOT|MUST|SHOULD\sNOT|SHOULD|SHALL\sNOT|SHALL|RECOMMENDED|NOT\sRECOMMENDED|MAY|OPTIONAL|REQUIRED)/g
    const sourcecodeRgx = /<sourcecode>[\s\S]*?<\/sourcecode>/g
    const sourcecodeRanges = []
    const keywordsReplaces = []
    let match

    // List all sourcecode blocks first to exclude them
    while ((match = sourcecodeRgx.exec(text)) !== null) {
      sourcecodeRanges.push(new vscode.Range(doc.positionAt(match.index), doc.positionAt(match.index + match[0].length)))
    }

    // Match all BCP 14 keywords
    while ((match = matchRgx.exec(text)) !== null) {
      if (match.groups?.term) {
        const term = match.groups.term
        const startPos = doc.positionAt(match.index)
        const endPos = doc.positionAt(match.index + match[0].length)

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
