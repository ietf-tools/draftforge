import * as vscode from 'vscode'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 */
export function registerCheckPlaceholdersCommand (context, diagnosticCollection) {
  const ignores = [] // TODO: implement ignoes
  
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.checkPlaceholders', async function (clearFirst = true) {
    if (clearFirst) {
      diagnosticCollection.clear()
    }

    try {
      const activeDoc = vscode.window.activeTextEditor.document

      const matchRgx = /(?:[^a-z0-9]|RFC)(?<term>TBD|TBA|XX|YY|NN|MM|0000|TODO)(?:[^a-z0-9])/gi

      const diags = []
      const occurences = []
      const termCount = {}
      for (let lineIdx = 0; lineIdx < activeDoc.lineCount; lineIdx++) {
        const line = activeDoc.lineAt(lineIdx)
        for (const match of line.text.matchAll(matchRgx)) {
          const term = match[1].toLowerCase()
          if (ignores.includes(term)) {
            continue
          }
          const termStartIndex = match[0].indexOf(match[1])
          let occIdx = occurences.indexOf(term)
          if (occIdx < 0) {
            occIdx = occurences.push(term) - 1
          }
          diags.push(new vscode.Diagnostic(
            new vscode.Range(lineIdx, match.index + termStartIndex, lineIdx, match.index + termStartIndex + match[1].length),
            `Common placeholder term ${match[1]} detected.`,
            vscode.DiagnosticSeverity.Warning
          ))
          if (termCount[term]) {
            termCount[term]++
          } else {
            termCount[term] = 1
          }
        }
      }

      if (diags?.length > 0) {
        if (diagnosticCollection.has(activeDoc.uri)) {
          diagnosticCollection.set(activeDoc.uri, [...diagnosticCollection.get(activeDoc.uri), ...diags])
        } else {
          diagnosticCollection.set(activeDoc.uri, diags)
        }
        
        await vscode.commands.executeCommand('workbench.action.problems.focus')
      } else {
        vscode.window.showInformationMessage('No common placeholders found in this document.')
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}