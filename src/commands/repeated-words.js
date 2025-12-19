import * as vscode from 'vscode'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 * @param {Object} ignores
 */
export function registerCheckRepeatedWordsCommand (context, diagnosticCollection, ignores) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.checkRepeatedWords', async function (clearFirst = true) {
    if (clearFirst) {
      diagnosticCollection.clear()
    }

    try {
      const activeDoc = vscode.window.activeTextEditor.document

      const eligibleIgnores = ignores[activeDoc.uri.toString()]?.repeatedWords ?? []

      const matchRgx = /\b(\w+)\s+\1\b/gi

      const diags = []
      const occurences = []
      const termCount = {}
      for (let lineIdx = 0; lineIdx < activeDoc.lineCount; lineIdx++) {
        const line = activeDoc.lineAt(lineIdx)
        for (const match of line.text.matchAll(matchRgx)) {
          const term = match[1].toLowerCase()
          if (eligibleIgnores.includes(term)) {
            continue
          }
          const termStartIndex = match[0].indexOf(match[1])
          let occIdx = occurences.indexOf(term)
          if (occIdx < 0) {
            occIdx = occurences.push(term) - 1
          }

          const diag = new vscode.Diagnostic(
            new vscode.Range(lineIdx, match.index + termStartIndex, lineIdx, match.index + termStartIndex + match[0].length),
            `Repeated term "${match[1]}" detected.`,
            vscode.DiagnosticSeverity.Warning
          )
          diag.source = 'DraftForge'
          diag.code = 'repeatedWords'
          // @ts-ignore
          diag.match = term
          diags.push(diag)
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
        vscode.window.showInformationMessage('No repeated words found in this document.')
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
