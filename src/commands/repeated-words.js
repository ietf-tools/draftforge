import * as vscode from 'vscode'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 * @param {Object} ignores
 */
export function registerCheckRepeatedWordsCommand(context, diagnosticCollection, ignores) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'draftforge.checkRepeatedWords',
      async function (clearFirst = true) {
        if (clearFirst) {
          diagnosticCollection.clear()
        }

        try {
          const activeDoc = vscode.window.activeTextEditor?.document

          if (!activeDoc) {
            return vscode.window.showErrorMessage('Open a document first.')
          } else if (activeDoc.uri.scheme === 'output') {
            return vscode.window.showErrorMessage(
              'Focus your desired document first. Focus is currently in the Output window.'
            )
          } else if (!['xml', 'markdown', 'plaintext'].includes(activeDoc.languageId)) {
            return vscode.window.showErrorMessage('Unsupported Document Type.')
          }

          const eligibleIgnores = ignores[activeDoc.uri.toString()]?.repeatedWords ?? []

          // Separated by whitespace spanning at most one line break, so that repeats wrapped
          // across lines are caught but repeats across a paragraph break are not.
          const matchRgx = /\b(\w+)(?=\s)[^\S\n]*\n?[^\S\n]*\1\b/gi

          const diags = []
          const occurences = []
          const termCount = {}
          for (const match of activeDoc.getText().matchAll(matchRgx)) {
            const term = match[1].toLowerCase()
            if (eligibleIgnores.includes(term)) {
              continue
            }
            let occIdx = occurences.indexOf(term)
            if (occIdx < 0) {
              occIdx = occurences.push(term) - 1
            }

            const diag = new vscode.Diagnostic(
              new vscode.Range(
                activeDoc.positionAt(match.index),
                activeDoc.positionAt(match.index + match[0].length)
              ),
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

          if (diags?.length > 0) {
            if (diagnosticCollection.has(activeDoc.uri)) {
              diagnosticCollection.set(activeDoc.uri, [
                ...diagnosticCollection.get(activeDoc.uri),
                ...diags
              ])
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
      }
    )
  )
}
