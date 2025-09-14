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
    suggestion: 'more than',
    multiline: true
  },
  {
    triggers: ['greater that', 'greater then'],
    suggestion: 'greater than',
    multiline: true
  },
  {
    triggers: ['less that', 'less then'],
    suggestion: 'less than',
    multiline: true
  },
  {
    triggers: ['fewer that', 'fewer then'],
    suggestion: 'fewer than',
    multiline: true
  },
  {
    triggers: ['different that', 'different then'],
    suggestion: 'different than',
    multiline: true
  },
  {
    triggers: ['rather that', 'rather then'],
    suggestion: 'rather than',
    multiline: true
  },
  {
    triggers: ['other that', 'other then'],
    suggestion: 'other than',
    multiline: true
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
    suggestion: 'according to the',
    multiline: true
  },
  {
    triggers: ['specified section'],
    suggestion: 'specified in Section',
    multiline: true
  },
  {
    triggers: ['provided section'],
    suggestion: 'provided in Section',
    multiline: true
  },
  {
    triggers: ['described section'],
    suggestion: 'described in Section',
    multiline: true
  },
  {
    triggers: ['discussed section'],
    suggestion: 'discussed in Section',
    multiline: true
  },
  {
    triggers: ['detailed section'],
    suggestion: 'detailed in Section',
    multiline: true
  },
  {
    triggers: ['listed section'],
    suggestion: 'listed in Section',
    multiline: true
  },
  {
    triggers: ['defined section'],
    suggestion: 'defined in Section',
    multiline: true
  },
  {
    triggers: ['presented section'],
    suggestion: 'presented in Section',
    multiline: true
  },
  {
    triggers: ['specified this'],
    suggestion: 'specified in this',
    multiline: true
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
    suggestion: 'IPv4/IPv6 (case sensitive)',
    caseSensitive: true
  },
  {
    triggers: ['mime media type'],
    suggestion: 'media type',
    multiline: true
  },
  {
    triggers: ['central express way'],
    suggestion: 'Central Expressway',
    multiline: true
  },
  {
    triggers: ['some the'],
    suggestion: 'some of the',
    multiline: true
  },
  {
    triggers: ['have be'],
    suggestion: 'have been',
    multiline: true
  },
  {
    triggers: ['has be'],
    suggestion: 'has been',
    multiline: true
  },
  {
    triggers: ['huawei technology'],
    suggestion: 'Huawei Technologies',
    multiline: true
  },
  {
    triggers: ['number authority'],
    suggestion: 'Numbers Authority',
    multiline: true
  },
  {
    triggers: ['amphitheater', 'ampitheater', 'ampitheatre'],
    suggestion: 'Amphitheatre'
  },
  {
    triggers: ['international telecommunications union'],
    suggestion: 'International Telecommunication Union',
    multiline: true
  },
  {
    triggers: ['any the'],
    suggestion: 'any of the',
    multiline: true
  },
  {
    triggers: ['the of'],
    suggestion: 'the',
    multiline: true
  },
  {
    triggers: ['described rfc'],
    suggestion: 'described in RFC',
    multiline: true
  },
  {
    triggers: ['may chose'],
    suggestion: 'may choose',
    multiline: true
  },
  {
    triggers: ['to chose'],
    suggestion: 'to choose',
    multiline: true
  },
  {
    triggers: ['Designated Expert'],
    suggestion: 'designated expert',
    caseSensitive: true
  },
  {
    triggers: ['needs be'],
    suggestion: 'needs to be',
    multiline: true
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
  const matchRgx = new RegExp(`[<> "'.:;=([{-](${flatten(dictionnary.map(d => d.triggers)).join('|')})(?:[^a-z0-9])`, 'gi')
  const textLines = text.split('\n')

  const decorations = []
  const occurences = []
  const details = []
  const termCount = {}
  for (const [lineIdx, line] of textLines.entries()) {
    for (const match of line.matchAll(matchRgx)) {
      const term = match[1].toLowerCase()
      if (ignores.includes(term)) {
        continue
      }
      const dictEntry = find(dictionnary, d => d.triggers.includes(term))
      let occIdx = occurences.indexOf(term)
      if (occIdx < 0) {
        occIdx = occurences.push(term) - 1
      }
      decorations.push({
        options: {
          hoverMessage: {
            value: `Did you mean ${dictEntry.suggestion}?`
          },
          className: 'dec-warning',
          minimap: {
            position: 1
          },
          glyphMarginClassName: 'dec-warning-margin'
        },
        range: {
          startLineNumber: lineIdx + 1,
          startColumn: match.index + 2,
          endLineNumber: lineIdx + 1,
          endColumn: match.index + 2 + match[1].length
        }
      })
      details.push({
        key: crypto.randomUUID(),
        group: occIdx + 1,
        message: match[1].toLowerCase(),
        range: {
          startLineNumber: lineIdx + 1,
          startColumn: match.index + 2,
          endLineNumber: lineIdx + 1,
          endColumn: match.index + 2 + match[1].length
        },
        value: term
      })
      if (termCount[term]) {
        termCount[term]++
      } else {
        termCount[term] = 1
      }
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
