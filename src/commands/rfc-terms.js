import * as vscode from 'vscode'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 * @param {Object} ignores
 */
export function registerCheckRfcTermsCommand (context, diagnosticCollection, ignores) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.checkRfcTerms', async function (clearFirst = true) {
    if (clearFirst) {
      diagnosticCollection.clear()
    }

    try {
      const activeDoc = vscode.window.activeTextEditor.document

      const eligibleIgnores = ignores[activeDoc.uri.toString()]?.rfcTerms ?? []

      const matchRgx = /RFC series|IETF stream|IAB stream|IRTF stream|independent stream|IAB-stream|IRTF-stream|IETF-stream|internet draft|last call|chair|director|IETF member|IAB member|IETF engineer|earlier version|previous version|future version|IETF RFC|IAB RFC|IRTF RFC|standards track|standards-track|experimental|informational|best current practice|historic|proposed standard|draft standard|internet standard|full standard|working group|area director|shepherd/gi

      const diags = []
      const termCount = {}
      for (let lineIdx = 0; lineIdx < activeDoc.lineCount; lineIdx++) {
        const line = activeDoc.lineAt(lineIdx)
        for (const match of line.text.matchAll(matchRgx)) {
          const term = match[0].toLowerCase()
          if (eligibleIgnores.includes(term)) {
            continue
          }

          const diag = new vscode.Diagnostic(
            new vscode.Range(lineIdx, match.index, lineIdx, match.index + match[0].length),
            `"${term}" is a potential RFC-specific term. Ensure proper usage.`,
            vscode.DiagnosticSeverity.Information
          )
          diag.source = 'DraftForge'
          diag.code = 'rfcTerms'
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
        vscode.window.showInformationMessage('No RFC-specific terms found in this document.')
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
