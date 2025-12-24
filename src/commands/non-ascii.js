import * as vscode from 'vscode'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 */
export function registerCheckNonAsciiCommand (context, diagnosticCollection) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.checkNonAscii', async function (clearFirst = true) {
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

      const matchRgx = /[^\x00-\x7F]+/gi

      const diags = []
      for (let lineIdx = 0; lineIdx < activeDoc.lineCount; lineIdx++) {
        const line = activeDoc.lineAt(lineIdx)
        for (const match of line.text.matchAll(matchRgx)) {
          const diag = new vscode.Diagnostic(
            new vscode.Range(lineIdx, match.index, lineIdx, match.index + match[0].length),
            `Non-ASCII character(s) detected.`,
            vscode.DiagnosticSeverity.Warning
          )
          diag.source = 'DraftForge'
          diag.code = 'nonAscii'
          diags.push(diag)
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
        vscode.window.showInformationMessage('No non-ascii characters found in this document.')
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
