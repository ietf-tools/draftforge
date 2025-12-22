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
      const matchRgxRFC = /\sRFC[0-9]+|\(RFC[0-9]+|RFC-[0-9]+/gi
      const matchRgxDescribedRFC = /described \[RFC[0-9]+\]/gi
      const matchRgxAdverbLy = /[a-z]+ly-/gi
      const matchRgxEdFigureTable = /[a-z]+ed (Figure|Table)/gi
      const matchRgxPunct = / ,|,,| \./g
      const matchRgxBCP14 = /(MUST not|SHOULD not|SHALL not|MAY not|MAY NOT|not RECOMMENDED|OPTIONALLY|RECOMMEND|RECOMMENDS|RECOMMENDING)(?:[^a-zA-Z0-9]|$)/g
      const matchRgxSee = /[a-zA-Z0-9] \(See /g
      const matchRgxDashRef = /{#[a-z0-9-_@.:;=]+}/gi

      const diags = []
      const occurences = []
      const termCount = {}

      /**
       * Process match from the typos dictionnary
       * @param {String} term Matched term
       * @param {Object} match The regex match object
       * @param {Number} lineIdx Line Number
       * @param {Boolean} caseSensitive Is a case sensitive match
       */
      function processMatch (term, match, lineIdx, caseSensitive = false) {
        const dictEntry = find(dictionnary, d => d.triggers.includes(term))
        let occIdx = occurences.indexOf(term)
        if (occIdx < 0) {
          occIdx = occurences.push(term) - 1
        }
        const startColumnAdjusted = match.index === 0 ? match.index : match.index + 1

        addDiag(
          new vscode.Range(lineIdx, startColumnAdjusted, lineIdx, startColumnAdjusted + match[1].length),
          caseSensitive ? `Possible typo: ${term}. Did you mean "${dictEntry.suggestion}"? (case sensitive)` : `Possible typo: ${term}. Did you mean "${dictEntry.suggestion}"?`,
          term
        )

        if (termCount[term]) {
          termCount[term]++
        } else {
          termCount[term] = 1
        }
      }

      /**
       * Add new Diagnostic
       * @param {vscode.Range} range Diagnostic Range
       * @param {string} msg Diagnostic Message
       * @param {string} term Matched Term
       * @returns {void}
       */
      function addDiag(range, msg, term) {
        const diag = new vscode.Diagnostic(
          range,
          msg,
          vscode.DiagnosticSeverity.Warning
        )
        diag.source = 'DraftForge'
        diag.code = 'typos'
        // @ts-ignore
        diag.match = term
        diags.push(diag)
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

        // RFC[x] formatting typos
        for (const match of lineTrimmed.matchAll(matchRgxRFC)) {
          if (eligibleIgnores.includes(match[0].toLowerCase())) {
            // Skip matches in the ignore list
            continue
          }
          addDiag(
            new vscode.Range(lineIdx, match.index, lineIdx, match.index + match[0].length),
            `"${match[0]}" should be bracketed and non-hyphenated.`,
            match[0]
          )
        }

        // Described RFC[x] typos
        for (const match of combinedLine.matchAll(matchRgxDescribedRFC)) {
          if (match.index >= lineTrimmed.length) {
            // Skip matches in the second combined line
            continue
          }
          if (eligibleIgnores.includes(match[0].toLowerCase())) {
            // Skip matches in the ignore list
            continue
          }
          addDiag(
            new vscode.Range(lineIdx, match.index, lineIdx, match.index + match[0].length),
            `"${match[0]}" should be "${match[0].replace('ed [R', 'ed in [R')}".`,
            match[0]
          )
        }

        // Adverbs ending in "ly-" typos
        for (const match of lineTrimmed.matchAll(matchRgxAdverbLy)) {
          if (eligibleIgnores.includes(match[0].toLowerCase())) {
            // Skip matches in the ignore list
            continue
          }
          addDiag(
            new vscode.Range(lineIdx, match.index, lineIdx, match.index + match[0].length),
            `"${match[0]}" is potentially incorrect. Hyphens after adverbs ending in "ly" should be avoided.`,
            match[0]
          )
        }

        // -ed Figure / -ed Table typos
        for (const match of combinedLine.matchAll(matchRgxEdFigureTable)) {
          if (match.index >= lineTrimmed.length) {
            // Skip matches in the second combined line
            continue
          }
          if (eligibleIgnores.includes(match[0].toLowerCase())) {
            // Skip matches in the ignore list
            continue
          }
          addDiag(
            new vscode.Range(lineIdx, match.index, lineIdx, match.index + match[0].length),
            `"${match[0]}" should be "${match[0].replace('ed Figure', 'ed in Figure').replace('ed Table', 'ed in Table')}".`,
            match[0]
          )
        }

        // Extra spaces before commas and periods + double commas
        for (const match of lineTrimmed.matchAll(matchRgxPunct)) {
          if (eligibleIgnores.includes(match[0])) {
            // Skip matches in the ignore list
            continue
          }
          addDiag(
            new vscode.Range(lineIdx, match.index, lineIdx, match.index + match[0].length),
            `Potential extra space before comma/period or double commas typo.`,
            match[0]
          )
        }

        // Extra spaces before commas and periods + double commas
        for (const match of combinedLine.matchAll(matchRgxBCP14)) {
          if (match.index >= lineTrimmed.length) {
            // Skip matches in the second combined line
            continue
          }
          if (eligibleIgnores.includes(match[1])) {
            // Skip matches in the ignore list
            continue
          }
          addDiag(
            new vscode.Range(lineIdx, match.index, lineIdx, match.index + match[1].length),
            `"${match[1]}" is an invalid BCP 14 keyword or has improper casing.`,
            match[1]
          )
        }
        // ... (See ) typos
        for (const match of lineTrimmed.matchAll(matchRgxSee)) {
          if (eligibleIgnores.includes(match[0])) {
            // Skip matches in the ignore list
            continue
          }
          addDiag(
            new vscode.Range(lineIdx, match.index, lineIdx, match.index + match[0].length),
            `"...${match[0]}": The term "see" should be lowercase when used mid-sentence.`,
            match[0]
          )
        }

        // {# that should be <xref...>
        if (activeDoc.languageId === 'xml') {
          for (const match of lineTrimmed.matchAll(matchRgxDashRef)) {
            if (eligibleIgnores.includes(match[0])) {
              // Skip matches in the ignore list
              continue
            }
            addDiag(
              new vscode.Range(lineIdx, match.index, lineIdx, match.index + match[0].length),
              `"${match[0]}" is potentially incorrect and should be replaced by <xref ...>`,
              match[0]
            )
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
        vscode.window.showInformationMessage('No typos found in this document.')
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
