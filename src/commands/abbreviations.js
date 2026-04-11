import * as vscode from 'vscode'
import { uniq } from 'es-toolkit/array'
import { escapeRegExp } from 'es-toolkit/string'
import { setTimeout } from 'node:timers/promises'

const ABBR_URL =
  'https://github.com/rfc-editor-drafts/common/raw/refs/heads/main/abbreviations.json'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.OutputChannel} outputChannel
 */
export function registerListAbbreviationsCommand(context, outputChannel) {
  let abbreviations = []

  context.subscriptions.push(
    vscode.commands.registerCommand('draftforge.listAbbreviations', async function () {
      try {
        const activeDoc = vscode.window.activeTextEditor?.document

        if (!activeDoc) {
          return vscode.window.showErrorMessage('Open a document first.')
        } else if (activeDoc.uri.scheme === 'output') {
          return vscode.window.showErrorMessage(
            'Focus your desired document first. Focus is currently in the Output window.'
          )
        } else if (!['xml', 'markdown', 'plaintext'].includes(activeDoc.languageId)) {
          return vscode.window.showErrorMessage('Unsupported Document Type.')
        }

        const selectedMode = await vscode.window.showQuickPick(
          [
            { label: 'Match from the predefined RPC list only', picked: true, value: 'predefined' },
            { label: 'Match anything resembling an abbreviation', value: 'anything' }
          ],
          {
            ignoreFocusOut: true,
            title: 'Select Matching Mode'
          }
        )

        const results = []
        outputChannel.clear()

        // Show progress notification
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing abbreviations usage',
            cancellable: false
          },
          async (progress) => {
            try {
              const progressIncrement = 100 / abbreviations.length
              const contents = activeDoc.getText()

              // Fetch list from GitHub
              if (abbreviations.length < 1) {
                try {
                  const resp = await fetch(ABBR_URL).then((r) => r.json())
                  if (Array.isArray(resp) && resp?.length > 0) {
                    abbreviations = resp
                  } else {
                    throw new Error('Failed to fetch abbreviations list from GitHub.')
                  }
                } catch (err) {
                  if (err.name === 'SyntaxError') {
                    throw new Error('Remote abbreviations.json file has invalid formatting.')
                  } else {
                    throw err
                  }
                }
              }

              // Detect anything resembling an abbreviation
              if (selectedMode?.value === 'anything') {
                const anythingRgx = /(?:^|[\s>([*_])(?<term>[A-Z0-9]{2,})(?:$|[\s.,<>)*_\]:])/g

                let rgxArray

                while ((rgxArray = anythingRgx.exec(contents)) !== null) {
                  if (rgxArray.groups?.term) {
                    const term = rgxArray.groups?.term
                    const startIdx =
                      rgxArray[0].indexOf(term) === 0 ? rgxArray.index : rgxArray.index + 1

                    const line = activeDoc.lineAt(activeDoc.positionAt(rgxArray.index))

                    if (abbreviations.some((abbr) => abbr.term === term)) {
                      // Skip matches that are in the predefined list
                      continue
                    }
                  }
                }
              }

              // Check each abbreviation
              for (const abbr of abbreviations) {
                progress.report({ increment: progressIncrement, message: abbr.term })

                let rgxArray
                const foundLocations = []
                let firstTermIdx = -1
                let firstFullIdx = -1

                // Look for term
                const termRgx = new RegExp(
                  `(?:^|[\\s>([*_])(?<term>${escapeRegExp(abbr.term)}(s?))(?:$|[\\s.,<>)*_\\]:])`,
                  'g'
                )

                while ((rgxArray = termRgx.exec(contents)) !== null) {
                  if (rgxArray.groups?.term) {
                    const startIdx =
                      rgxArray[0].indexOf(abbr.term) === 0 ? rgxArray.index : rgxArray.index + 1
                    if (startIdx < firstTermIdx || firstTermIdx < 0) {
                      firstTermIdx = startIdx
                    }
                    foundLocations.push({
                      type: 'term',
                      indexStart: startIdx,
                      indexEnd: startIdx + abbr.term.length
                    })
                  }
                }

                // Look for full expansion
                if (abbr.full) {
                  const fullRgx = new RegExp(
                    `(?:^|[\\s>([*_])(?<full>${escapeRegExp(abbr.full)}(s?))(?:$|[\\s.,<>)*_\\]:])`,
                    'gi'
                  )

                  while ((rgxArray = fullRgx.exec(contents)) !== null) {
                    if (rgxArray.groups?.full) {
                      const startIdx =
                        rgxArray[0].indexOf(abbr.full) === 0 ? rgxArray.index : rgxArray.index + 1
                      if (startIdx < firstFullIdx || firstFullIdx < 0) {
                        firstFullIdx = startIdx
                      }
                      foundLocations.push({
                        type: 'full',
                        indexStart: startIdx,
                        indexEnd: startIdx + abbr.full.length
                      })
                    }
                  }

                  // Look for redundant word after abbreviation
                  const lastExpansionWord = abbr.full.split(' ').pop()
                  const redundantRgx = new RegExp(
                    `(?:^|[\\s>([*_])(?<term>${escapeRegExp(abbr.term)}[\\s\\-]${escapeRegExp(lastExpansionWord)})(?:$|[\\s.,<>)*_\\]:])`,
                    'gi'
                  )
                  while ((rgxArray = redundantRgx.exec(contents)) !== null) {
                    if (rgxArray.groups?.term) {
                      const startIdx =
                        rgxArray[0].indexOf(abbr.term) === 0 ? rgxArray.index : rgxArray.index + 1
                      if (startIdx < firstTermIdx || firstTermIdx < 0) {
                        firstTermIdx = startIdx
                      }
                      foundLocations.push({
                        type: 'redundant',
                        indexStart: startIdx,
                        indexEnd: startIdx + abbr.term.length + 1 + lastExpansionWord.length,
                        match: rgxArray.groups.term
                      })
                    }
                  }
                }

                // Store locations for post-processing
                if (foundLocations.length > 0) {
                  results.push({ ...abbr, _locations: foundLocations })
                }

                // Wait for next tick to avoid freezing the progress UI
                await setTimeout()
              }

              // Exclude full expansion matches that are contained within a longer full expansion match
              const allFullLocations = results.flatMap((r) =>
                r._locations.filter((l) => l.type === 'full')
              )
              for (const result of results) {
                result._locations = result._locations.filter((loc) => {
                  if (loc.type !== 'full') return true
                  return !allFullLocations.some(
                    (other) =>
                      other !== loc &&
                      other.indexStart <= loc.indexStart &&
                      other.indexEnd > loc.indexEnd
                  )
                })
              }

              // Remove results with no remaining locations after filtering
              results.splice(0, results.length, ...results.filter((r) => r._locations.length > 0))

              // Compute result flags from filtered locations
              for (const result of results) {
                const locations = result._locations
                const termInstances = locations.filter((fl) => fl.type === 'term')
                const fullInstances = locations.filter((fl) => fl.type === 'full')
                const redundantInstances = locations.filter((fl) => fl.type === 'redundant')

                const firstTermIdx =
                  termInstances.length > 0
                    ? Math.min(...termInstances.map((l) => l.indexStart))
                    : -1
                const firstFullIdx =
                  fullInstances.length > 0
                    ? Math.min(...fullInstances.map((l) => l.indexStart))
                    : -1

                if (firstTermIdx >= 0 && firstFullIdx >= 0) {
                  result.expanded = true
                  if (firstTermIdx < firstFullIdx) {
                    result.usedBeforeExpansion = true
                  }
                  if (fullInstances.length > 1) {
                    result.overusedExpansion = fullInstances.length - 1
                  }
                  if (termInstances.length === 1) {
                    result.pointlessAbbreviation = true
                  }
                } else if (firstFullIdx >= 0) {
                  if (fullInstances.length > 1) {
                    result.notAbbreviated = true
                    result.overusedExpansion = fullInstances.length - 1
                  }
                }
                if (redundantInstances.length > 0) {
                  result.redundantTerms = uniq(redundantInstances.map((fl) => fl.match))
                }
              }
            } catch (err) {
              vscode.window.showErrorMessage(err.message)
            }
          }
        )

        outputChannel.appendLine(`List of abbreviations usage in ${activeDoc.fileName}:\n`)
        let idx = 0
        let totalWarnings = 0
        const lf = new Intl.ListFormat('en')

        // Output results
        for (const result of results) {
          let resultStr = result.term
          let resultArr = []
          let isWarning = false
          let isIndented = false

          // -> Check for abbreviations with multiple expansions
          const multiExpansions = results.filter((fl) => fl.term === result.term)
          if (multiExpansions.length > 1) {
            if (!multiExpansions.some((me) => me.expanded)) {
              if (!multiExpansions.some((me) => me.chosen)) {
                // No term is expanded, just show the first one
                result.chosen = true
              } else {
                // No term is expanded and the first one is already displayed, skip the rest
                continue
              }
            } else if (!result.expanded) {
              // Another term is expanded, skip this one as it's not expanded
              continue
            } else {
              if (multiExpansions.filter((fl) => fl.expanded).length > 1) {
                isIndented = true

                if (!multiExpansions.some((me) => me.chosen)) {
                  // Warn that multiple expansions will be listed
                  result.chosen = true
                  outputChannel.appendLine(`🔶 Multiple expansions for ${result.term}:`)
                }
              }
            }
          }

          idx++

          // -> Well Known
          if (result.wellknown) {
            resultArr.push('is well known')
          }
          // -> Expanded / Not Expanded
          if (result.expanded) {
            if (result.usedBeforeExpansion && !result.wellknown) {
              isWarning = true
              resultArr.push(`used before the expansion "${result.full}"`)
            } else {
              resultArr.push(`expanded as "${result.full}"`)
            }
          } else if (!result.notAbbreviated) {
            if (result.wellknown) {
              resultArr.push('not expanded')
            } else {
              isWarning = true
              resultArr.push('not expanded')
            }
          }
          // -> Too many expansions
          if (result.overusedExpansion) {
            isWarning = true
            if (result.notAbbreviated) {
              resultArr.push(
                `"${result.full}" used ${result.overusedExpansion + 1} times but never abbreviated as "${result.term}"`
              )
            } else {
              resultArr.push(
                `expansion used ${result.overusedExpansion} extra time(s) after initial expansion of "${result.term}"`
              )
            }
          }
          // -> Pointless abbreviation
          if (result.pointlessAbbreviation && !result.overusedExpansion) {
            isWarning = true
            resultArr.push('only used once')
          }
          // -> Redundant wording
          if (result.redundantTerms) {
            isWarning = true
            resultArr.push(
              'has redundant word after abbreviation: ' +
                lf.format(result.redundantTerms.map((t) => `"${t}"`))
            )
          }
          // -> Format List + Warnings
          resultStr += ` - ${lf.format(resultArr)}`
          if (isWarning) {
            totalWarnings++
            resultStr = `⚠️ ${resultStr}`
          } else {
            resultStr = `🟢 ${resultStr}`
          }
          if (isIndented) {
            resultStr = `└─ ${resultStr}`
          }
          outputChannel.appendLine(resultStr)
        }

        if (idx === 0) {
          outputChannel.appendLine('No abbreviations found.')
          vscode.window.showInformationMessage('No abbreviations found.')
        } else {
          if (totalWarnings) {
            outputChannel.appendLine(
              `\nFound ${idx} abbreviations (${totalWarnings} with ⚠️ warnings).`
            )
          } else {
            outputChannel.appendLine(`\nFound ${idx} abbreviations.`)
          }
          vscode.window.showInformationMessage(
            `Found ${idx} abbreviation(s). See Output: DraftForge`
          )
        }

        outputChannel.show(true)
      } catch (err) {
        console.warn(err)
        vscode.window.showErrorMessage(err.message)
      }
    })
  )
}
