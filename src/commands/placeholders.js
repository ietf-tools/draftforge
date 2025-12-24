import * as vscode from 'vscode'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 * @param {Object} ignores
 */
export function registerCheckPlaceholdersCommand (context, diagnosticCollection, ignores) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.checkPlaceholders', async function (clearFirst = true) {
    if (clearFirst) {
      diagnosticCollection.clear()
    }

    try {
      const activeDoc = vscode.window.activeTextEditor?.document

      if (!activeDoc) {
        return vscode.window.showErrorMessage('Open a document first.')
      } else if (activeDoc.uri.scheme === 'output') {
        return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
      } else if (!['xml', 'markdown', 'plaintext'].includes(activeDoc.languageId)) {
        return vscode.window.showErrorMessage('Unsupported Document Type.')
      }

      const eligibleIgnores = ignores[activeDoc.uri.toString()]?.placeholders ?? []

      const matchRgx = /(?:[^a-z0-9]|RFC)(?<term>TBD|TBA|XX|YY|NN|MM|0000|TODO)(?:[^a-z0-9])/gi

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
            new vscode.Range(lineIdx, match.index + termStartIndex, lineIdx, match.index + termStartIndex + match[1].length),
            `Common placeholder term ${match[1]} detected.`,
            vscode.DiagnosticSeverity.Warning
          )
          diag.source = 'DraftForge'
          diag.code = 'placeholders'
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
        vscode.window.showInformationMessage('No common placeholders found in this document.')
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
