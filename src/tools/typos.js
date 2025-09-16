import { find, flatten, sortBy } from 'lodash-es'
import { decorationsStore } from 'src/stores/models'

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

export function checkTypos (text, ignores = []) {
  const matchRgxCI = new RegExp(`(?:^|[<> "'.:;=([{-])(${flatten(dictionnary.filter(d => !d.caseSensitive).map(d => d.triggers)).join('|')})(?:[^a-z0-9]|$)`, 'gi')
  const matchRgxCS = new RegExp(`(?:^|[<> "'.:;=([{-])(${flatten(dictionnary.filter(d => d.caseSensitive).map(d => d.triggers)).join('|')})(?:[^a-zA-Z0-9]|$)`, 'g')
  const textLines = text.split('\n')

  const decorations = []
  const occurences = []
  const details = []
  const termCount = {}

  function processMatch (term, match, lineIdx, caseSensitive = false) {
    const dictEntry = find(dictionnary, d => d.triggers.includes(term))
    let occIdx = occurences.indexOf(term)
    if (occIdx < 0) {
      occIdx = occurences.push(term) - 1
    }
    const startColumnAdjusted = match.index === 0 ? match.index + 1 : match.index + 2
    decorations.push({
      options: {
        hoverMessage: {
          value: caseSensitive ? `Did you mean ${dictEntry.suggestion}? (case sensitive)` : `Did you mean ${dictEntry.suggestion}?`
        },
        className: 'dec-warning',
        minimap: {
          position: 1
        },
        glyphMarginClassName: 'dec-warning-margin'
      },
      range: {
        startLineNumber: lineIdx + 1,
        startColumn: startColumnAdjusted,
        endLineNumber: lineIdx + 1,
        endColumn: startColumnAdjusted + match[1].length
      }
    })
    details.push({
      key: crypto.randomUUID(),
      group: occIdx + 1,
      message: match[1].toLowerCase(),
      range: {
        startLineNumber: lineIdx + 1,
        startColumn: startColumnAdjusted,
        endLineNumber: lineIdx + 1,
        endColumn: startColumnAdjusted + match[1].length
      },
      value: term
    })
    if (termCount[term]) {
      termCount[term]++
    } else {
      termCount[term] = 1
    }
  }

  for (const [lineIdx, line] of textLines.entries()) {
    const lineTrimmed = line.trimEnd()
    const combinedLine = textLines[lineIdx + 1] ? `${lineTrimmed} ${textLines[lineIdx + 1].trimStart()}` : line

    // Match case insensitive typos
    for (const match of combinedLine.matchAll(matchRgxCI)) {
      if (match.index >= lineTrimmed.length) {
        // Skip matches in the second combined line
        continue
      }
      const term = match[1].toLowerCase()
      if (ignores.includes(term)) {
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
      if (ignores.includes(match[1].toLowerCase())) {
        // Skip matches in the ignore list
        continue
      }
      processMatch(match[1], match, lineIdx, true)
    }
  }

  decorationsStore.get('typos').set(decorations)

  return {
    count: decorations.length,
    details: sortBy(details, d => d.range.startLineNumber),
    hasTextOutput: true,
    getTextOutput: () => {
      return `Common Typos
-------------
${Object.entries(termCount).map(([k, v]) => `${k} (${v})`).join('\n')}
`
    }
  }
}
