import * as vscode from 'vscode'
import { find, flatten } from 'lodash-es'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 * @param {Object} ignores
 */
export function registerCheckTyposCommand (context, diagnosticCollection, ignores) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.checkTypos', async function (clearFirst = true) {
    if (clearFirst) {
      diagnosticCollection.clear()
    }

    try {
      const activeDoc = vscode.window.activeTextEditor.document

      const eligibleIgnores = ignores[activeDoc.uri.toString()]?.typos ?? []

      // TODO: special cases:
      // https://github.com/rfc-editor/editorial-tools/blob/main/typos
      // Faucheur (#442)
      // Brandenburg (#448)
      // RFC[0-9] (#482,488,494)
      // Farrel, Farel (#513,514)
      // described [RFC<#>] (#573)
      // ly- (#618)
      // -ed Figure <#> (#625)
      // -ed Table  <#> (#632)
      // extra commas / periods (#645-648)
      // RFCs 2119 and 8174 keywords (#658-668)
      // (see ... (#674-676)
      // {# (#698)

      const dictionnary = [
        {
          triggers: ['though'],
          suggestion: 'through'
        },
        {
          triggers: ['mange', 'manger'],
          suggestion: 'manage/manager'
        },
        {
          triggers: ['indicted', 'indicting'],
          suggestion: 'indicated/indicating'
        },
        {
          triggers: ['sate', 'sates'],
          suggestion: 'state(s)'
        },
        {
          triggers: ['massage'],
          suggestion: 'message'
        },
        {
          triggers: ['polices'],
          suggestion: 'policies'
        },
        {
          triggers: ['steam'],
          suggestion: 'stream'
        },
        {
          triggers: ['thee'],
          suggestion: 'three'
        },
        {
          triggers: ['handed', 'handing'],
          suggestion: 'handled/handling'
        },
        {
          triggers: ['pubic'],
          suggestion: 'public'
        },
        {
          triggers: ['widow'],
          suggestion: 'window'
        },
        {
          triggers: ['brain'],
          suggestion: 'Brian'
        },
        {
          triggers: ['fist'],
          suggestion: 'first'
        },
        {
          triggers: ['sever', 'severs'],
          suggestion: 'server(s)'
        },
        {
          triggers: ['singe', 'singes'],
          suggestion: 'single(s)'
        },
        {
          triggers: ['singed', 'singing'],
          suggestion: 'signed/signing'
        },
        {
          triggers: ['covey'],
          suggestion: 'convey'
        },
        {
          triggers: ['more that', 'more then'],
          suggestion: 'more than'
        },
        {
          triggers: ['greater that', 'greater then'],
          suggestion: 'greater than'
        },
        {
          triggers: ['less that', 'less then'],
          suggestion: 'less than'
        },
        {
          triggers: ['fewer that', 'fewer then'],
          suggestion: 'fewer than'
        },
        {
          triggers: ['different that', 'different then'],
          suggestion: 'different than'
        },
        {
          triggers: ['rather that', 'rather then'],
          suggestion: 'rather than'
        },
        {
          triggers: ['other that', 'other then'],
          suggestion: 'other than'
        },
        {
          triggers: ['lager'],
          suggestion: 'larger'
        },
        {
          triggers: ['roaster'],
          suggestion: 'roster'
        },
        {
          triggers: ['according the'],
          suggestion: 'according to the'
        },
        {
          triggers: ['specified section'],
          suggestion: 'specified in Section'
        },
        {
          triggers: ['provided section'],
          suggestion: 'provided in Section'
        },
        {
          triggers: ['described section'],
          suggestion: 'described in Section'
        },
        {
          triggers: ['discussed section'],
          suggestion: 'discussed in Section'
        },
        {
          triggers: ['detailed section'],
          suggestion: 'detailed in Section'
        },
        {
          triggers: ['listed section'],
          suggestion: 'listed in Section'
        },
        {
          triggers: ['defined section'],
          suggestion: 'defined in Section'
        },
        {
          triggers: ['presented section'],
          suggestion: 'presented in Section'
        },
        {
          triggers: ['specified this'],
          suggestion: 'specified in this'
        },
        {
          triggers: ['exiting'],
          suggestion: 'existing'
        },
        {
          triggers: ['complaint'],
          suggestion: 'compliant'
        },
        {
          triggers: ['marcy'],
          suggestion: 'March'
        },
        {
          triggers: ['IPV4', 'IPV6'],
          suggestion: 'IPv4/IPv6',
          caseSensitive: true
        },
        {
          triggers: ['mime media type'],
          suggestion: 'media type'
        },
        {
          triggers: ['central express way'],
          suggestion: 'Central Expressway'
        },
        {
          triggers: ['some the'],
          suggestion: 'some of the'
        },
        {
          triggers: ['have be'],
          suggestion: 'have been'
        },
        {
          triggers: ['has be'],
          suggestion: 'has been'
        },
        {
          triggers: ['huawei technology'],
          suggestion: 'Huawei Technologies'
        },
        {
          triggers: ['number authority'],
          suggestion: 'Numbers Authority'
        },
        {
          triggers: ['amphitheater', 'ampitheater', 'ampitheatre'],
          suggestion: 'Amphitheatre'
        },
        {
          triggers: ['international telecommunications union'],
          suggestion: 'International Telecommunication Union'
        },
        {
          triggers: ['any the'],
          suggestion: 'any of the'
        },
        {
          triggers: ['the of'],
          suggestion: 'the'
        },
        {
          triggers: ['described rfc'],
          suggestion: 'described in RFC'
        },
        {
          triggers: ['may chose'],
          suggestion: 'may choose'
        },
        {
          triggers: ['to chose'],
          suggestion: 'to choose'
        },
        {
          triggers: ['Designated Expert'],
          suggestion: 'designated expert',
          caseSensitive: true
        },
        {
          triggers: ['needs be'],
          suggestion: 'needs to be'
        },
        {
          triggers: ['theses'],
          suggestion: 'these'
        },
        {
          triggers: ['boarder'],
          suggestion: 'border'
        },
        {
          triggers: ['raging'],
          suggestion: 'ranging'
        },
        {
          triggers: ['food'],
          suggestion: 'flood',
        },
        {
          triggers: ['null'],
          suggestion: 'NUL'
        },
        {
          triggers: ['sub-series'],
          suggestion: 'subseries'
        }
      ]
      const matchRgxCI = new RegExp(`(?:^|[<> "'.:;=([{-])(${flatten(dictionnary.filter(d => !d.caseSensitive).map(d => d.triggers)).join('|')})(?:[^a-z0-9]|$)`, 'gi')
      const matchRgxCS = new RegExp(`(?:^|[<> "'.:;=([{-])(${flatten(dictionnary.filter(d => d.caseSensitive).map(d => d.triggers)).join('|')})(?:[^a-zA-Z0-9]|$)`, 'g')

      const diags = []
      const occurences = []
      const termCount = {}

      function processMatch (term, match, lineIdx, caseSensitive = false) {
        const dictEntry = find(dictionnary, d => d.triggers.includes(term))
        let occIdx = occurences.indexOf(term)
        if (occIdx < 0) {
          occIdx = occurences.push(term) - 1
        }
        const startColumnAdjusted = match.index === 0 ? match.index : match.index + 1

        const diag = new vscode.Diagnostic(
          new vscode.Range(lineIdx, startColumnAdjusted, lineIdx, startColumnAdjusted + match[1].length),
          caseSensitive ? `Possible typo: ${term}. Did you mean "${dictEntry.suggestion}"? (case sensitive)` : `Possible typo: ${term}. Did you mean "${dictEntry.suggestion}"?`,
          vscode.DiagnosticSeverity.Warning
        )
        diag.source = 'DraftForge'
        diag.code = 'typos'
        // @ts-ignore
        diag.match = term
        diags.push(diag)

        if (termCount[term]) {
          termCount[term]++
        } else {
          termCount[term] = 1
        }
      }

      for (let lineIdx = 0; lineIdx < activeDoc.lineCount; lineIdx++) {
        const line = activeDoc.lineAt(lineIdx)
        const lineTrimmed = line.text.trimEnd()
        const combinedLine = lineIdx + 1 < activeDoc.lineCount ? `${lineTrimmed} ${activeDoc.lineAt(lineIdx + 1).text.trimStart()}` : line.text

        // Match case insensitive typos
        for (const match of combinedLine.matchAll(matchRgxCI)) {
          if (match.index >= lineTrimmed.length) {
            // Skip matches in the second combined line
            continue
          }
          const term = match[1].toLowerCase()
          if (eligibleIgnores.includes(term)) {
            // Skip matches in the ignore list
            continue
          }
          processMatch(term, match, lineIdx, false)
        }

        // Match case insensitive typos
        for (const match of combinedLine.matchAll(matchRgxCS)) {
          if (match.index >= lineTrimmed.length) {
            // Skip matches in the second combined line
            continue
          }
          if (eligibleIgnores.includes(match[1].toLowerCase())) {
            // Skip matches in the ignore list
            continue
          }
          processMatch(match[1], match, lineIdx, true)
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
        vscode.window.showInformationMessage('No typos found in this document.')
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
