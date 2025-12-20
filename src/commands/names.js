import * as vscode from 'vscode'
import { find, flatten } from 'lodash-es'

const AUTHOR_NAMES_URL = "https://github.com/rfc-editor-drafts/common/raw/refs/heads/main/names.json"

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 * @param {Object} ignores
 */
export function registerCheckNamesCommand (context, diagnosticCollection, ignores) {
  let names = []

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.checkNames', async function (clearFirst = true) {
    if (clearFirst) {
      diagnosticCollection.clear()
    }

    try {
      const activeDoc = vscode.window.activeTextEditor.document

      const eligibleIgnores = ignores[activeDoc.uri.toString()]?.names ?? []

      if (names.length < 1) {
        const resp = await fetch(AUTHOR_NAMES_URL).then(r => r.json())
        if (Array.isArray(resp) && resp?.length > 0) {
          names = resp
        } else {
          throw new Error('Failed to fetch author names preferences from GitHub.')
        }
      }

      const matchRgx = new RegExp(`(?:^|[<> "'.:;=([{-])(?<term>${flatten(names.map(d => d.match)).join('|')})(?:[^a-z0-9]|$)`, 'gi')

      const diags = []
      const termCount = {}
      for (let lineIdx = 0; lineIdx < activeDoc.lineCount; lineIdx++) {
        const line = activeDoc.lineAt(lineIdx)
        for (const match of line.text.matchAll(matchRgx)) {
          const term = match.groups.term
          if (eligibleIgnores.includes(term)) {
            continue
          }
          const startColumnAdjusted = match.index === 0 ? match.index : match.index + 1
          const dictEntry = find(names, d => d.match.includes(term))

          const diag = new vscode.Diagnostic(
            new vscode.Range(lineIdx, startColumnAdjusted, lineIdx, startColumnAdjusted + term.length),
            `Ensure "${term}" matches the author's preference: ${dictEntry?.description ?? 'Suggestion not found'}`,
            vscode.DiagnosticSeverity.Information
          )
          diag.source = 'DraftForge'
          diag.code = 'names'
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
        vscode.window.showInformationMessage('No author names suggestions for this document.')
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
