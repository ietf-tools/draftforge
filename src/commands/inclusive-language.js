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
      const activeDoc = vscode.window.activeTextEditor?.document

      if (!activeDoc) {
        return vscode.window.showErrorMessage('Open a document first.')
      } else if (activeDoc.uri.scheme === 'output') {
        return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
      } else if (!['xml', 'markdown', 'plaintext'].includes(activeDoc.languageId)) {
        return vscode.window.showErrorMessage('Unsupported Document Type.')
      }

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
          triggers: ['he/she', 'he / she', 'he or she'],
          suggestion: 'they'
        },
        {
          triggers: [
            'black',
            'white',
            'sanity',
            'dummy',
            'dark',
            'tradition',
            'traditional',
            'traditionally',
            'totem pole',
            'manmade',
            'elderly',
            'fireman',
            'firemen',
            'policeman',
            'policemen',
            'immature',
            'crazy',
            'dumb',
            'cripple',
            'handicap',
            'wheelchair',
            'impair',
            'impaired',
            'needy',
            'homeless',
            'jumping off',
            'right answer',
            'out in the left field',
            'male',
            'female',
            'he',
            'his',
            'him',
            'himself',
            'she',
            'her',
            'hers',
            'herself',
            'man-in-the-middle',
            'man in the middle',
            'hear',
            'hearing',
            'visual',
            'visually',
            'deficient',
            'deficiently',
            'deficiency'
          ]
        }
      ]
      const matchRgx = new RegExp(`(?:^|[<> "'.:;=([{-])(?<term>${flatten(dictionnary.map(d => d.triggers)).join('|')})(?:[^a-z0-9]|$)`, 'gi')

      const diags = []
      const occurences = []
      const termCount = {}
      for (let lineIdx = 0; lineIdx < activeDoc.lineCount; lineIdx++) {
        const line = activeDoc.lineAt(lineIdx)
        for (const match of line.text.matchAll(matchRgx)) {
          const term = match.groups.term.toLowerCase()
          if (eligibleIgnores.includes(term)) {
            continue
          }
          const termStartIndex = match[0].indexOf(match.groups.term)
          const dictEntry = find(dictionnary, d => d.triggers.includes(term))
          let occIdx = occurences.indexOf(term)
          if (occIdx < 0) {
            occIdx = occurences.push(term) - 1
          }

          const diag = new vscode.Diagnostic(
            new vscode.Range(lineIdx, match.index + termStartIndex, lineIdx, match.index + termStartIndex + match.groups.term.length),
            dictEntry.suggestion ? `Inclusive Language: Consider using ${dictEntry.suggestion} instead of "${term}".` : `Inclusive Language: "${term}" is potentially biased or ambiguous.`,
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
