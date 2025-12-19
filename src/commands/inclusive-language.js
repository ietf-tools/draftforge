import * as vscode from 'vscode'
import { find, flatten } from 'lodash-es'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 * @param {Object} ignores
 */
export function registerCheckInclusiveLanguageCommand (context, diagnosticCollection, ignores) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.checkInclusiveLanguage', async function (clearFirst = true) {
    if (clearFirst) {
      diagnosticCollection.clear()
    }

    try {
      const activeDoc = vscode.window.activeTextEditor.document

      const eligibleIgnores = ignores[activeDoc.uri.toString()]?.inclusiveLanguage ?? []

      const dictionnary = [
        {
          triggers: ['whitelist'],
          suggestion: 'allowlist or passlist'
        },
        {
          triggers: ['blacklist'],
          suggestion: 'denylist or blocklist'
        },
        {
          triggers: ['master'],
          suggestion: 'primary, main, host, leader or orchestrator'
        },
        {
          triggers: ['slave'],
          suggestion: 'secondary, replica, target, follower or worker'
        },
        {
          triggers: ['native'],
          suggestion: 'built-in'
        },
        {
          triggers: ['grandfather'],
          suggestion: 'exemption or approve'
        },
        {
          triggers: ['he/she', 'he or she'],
          suggestion: 'they'
        },
        {
          triggers: ['cripple', 'handicap'],
          suggestion: 'impair or impeded'
        }
      ]
      const matchRgx = new RegExp(`[<> "'.:;=([{-](${flatten(dictionnary.map(d => d.triggers)).join('|')})`, 'gi')

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
          const dictEntry = find(dictionnary, d => d.triggers.includes(term))
          let occIdx = occurences.indexOf(term)
          if (occIdx < 0) {
            occIdx = occurences.push(term) - 1
          }

          const diag = new vscode.Diagnostic(
            new vscode.Range(lineIdx, match.index + termStartIndex, lineIdx, match.index + termStartIndex + match[1].length),
            `Inclusive Language: Consider using ${dictEntry.suggestion} instead of "${term}".`,
            vscode.DiagnosticSeverity.Warning
          )
          diag.source = 'DraftForge'
          diag.code = 'inclusiveLanguage'
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
