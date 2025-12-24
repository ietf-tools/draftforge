import * as vscode from 'vscode'
import { repeat } from 'lodash-es'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 * @param {Object} ignores
 */
export function registerCheckHyphenationCommand (context, diagnosticCollection, ignores) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.checkHyphenation', async function (clearFirst = true) {
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

      const eligibleIgnores = ignores[activeDoc.uri.toString()]?.hyphenation ?? []

      const hyphenTermRgx = /[a-z]+(?:-[a-z]+)+/gi
      const targetPropRgx = / target="([^"]+?)"/gi

      const diags = []
      const occurences = []
      const hyphenTerms = []
      const hyphenTermsOccurences = []
      for (let lineIdx = 0; lineIdx < activeDoc.lineCount; lineIdx++) {
        const line = activeDoc.lineAt(lineIdx)
        const sanitizedLine =  line.text.replaceAll(targetPropRgx, (m, val) => {
          return ` target="${repeat(' ', val.length)}"`
        })
        for (const match of sanitizedLine.matchAll(hyphenTermRgx)) {
          if (match[0].length > 3) {
            const termLower = match[0].toLowerCase()
            if (eligibleIgnores.includes(termLower)) {
              continue
            }
            if (!hyphenTerms.includes(termLower)) {
              hyphenTerms.push(termLower)
            }
            hyphenTermsOccurences.push({
              term: termLower,
              range: new vscode.Range(lineIdx, match.index, lineIdx, match.index + match[0].length)
            })
          }
        }
      }

      if (hyphenTerms.length > 0) {
        for (let lineIdx = 0; lineIdx < activeDoc.lineCount; lineIdx++) {
          const line = activeDoc.lineAt(lineIdx)
          for (const term of hyphenTerms) {
            const altTerm = term.replaceAll('-', '')
            const altTermRgx = new RegExp(`(?:^|[>" ])(${altTerm})(?:[., "<]|$)`, 'gi')
            for (const match of line.text.matchAll(altTermRgx)) {
              const matchLower = match[1].toLowerCase()
              let occIdx = occurences.indexOf(term)
              if (occIdx < 0) {
                occIdx = occurences.push(term) - 1
                for (const termOcc of hyphenTermsOccurences.filter(t => t.term === term)) {
                  const diag = new vscode.Diagnostic(
                    termOcc.range,
                    `Inconsistent Hyphenation (${term} is alternate of ${altTerm})`,
                    vscode.DiagnosticSeverity.Warning
                  )
                  diag.source = 'DraftForge'
                  diag.code = 'hyphenation'
                  // @ts-ignore
                  diag.match = term
                  diags.push(diag)
                }
              }

              const diag = new vscode.Diagnostic(
                new vscode.Range(lineIdx, match.index + 1, lineIdx, match.index + match[0].length - 1),
                `Inconsistent Hyphenation (${matchLower} is alternate of ${term})`,
                vscode.DiagnosticSeverity.Warning
              )
              diag.source = 'DraftForge'
              diag.code = 'hyphenation'
              // @ts-ignore
              diag.match = matchLower
              diags.push(diag)
            }
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
        vscode.window.showInformationMessage('No hyphenation issues found in this document.')
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
