import * as vscode from 'vscode'
import { escapeRegExp, uniq } from 'lodash-es'
import { setTimeout } from 'node:timers/promises'

const ABBR_URL = "https://github.com/rfc-editor-drafts/common/raw/refs/heads/main/abbreviations.json"

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.OutputChannel} outputChannel
 */
export function registerListAbbreviationsCommand (context, outputChannel) {
  let abbreviations = []

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.listAbbreviations', async function () {
    try {
      const activeDoc = vscode.window.activeTextEditor?.document

      if (!activeDoc) {
        return vscode.window.showErrorMessage('Open a document first.')
      } else if (activeDoc.uri.scheme === 'output') {
        return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
      } else if (!['xml', 'markdown', 'plaintext'].includes(activeDoc.languageId)) {
        return vscode.window.showErrorMessage('Unsupported Document Type.')
      }

      const results = []
      outputChannel.clear()

      // Show progress notification
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing abbreviations usage',
        cancellable: false
      }, async (progress) => {
        try {

          // Fetch list from GitHub
          if (abbreviations.length < 1) {
            try {
              const resp = await fetch(ABBR_URL).then(r => r.json())
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
          const progressIncrement = 100 / abbreviations.length

          const contents = activeDoc.getText()

          // Check each abbreviation
          for (const abbr of abbreviations) {
            progress.report({ increment: progressIncrement, message: abbr.term })

            let rgxArray
            const foundLocations = []
            let firstTermIdx = -1
            let firstFullIdx = -1

            // Look for term
            const termRgx = new RegExp(`(?:^|[\\s>([])(?<term>${escapeRegExp(abbr.term)})(?:$|[\\s.,<>)\\]:])`, 'g')

            while ((rgxArray = termRgx.exec(contents)) !== null) {
              if (rgxArray.groups?.term) {
                const startIdx = rgxArray[0].indexOf(abbr.term) === 0 ? rgxArray.index : rgxArray.index + 1
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
              const fullRgx = new RegExp(`(?:^|[\\s>([])(?<full>${escapeRegExp(abbr.full)})(?:$|[\\s.,<>)\\]:])`, 'gi')

              while ((rgxArray = fullRgx.exec(contents)) !== null) {
                if (rgxArray.groups?.full) {
                  const startIdx = rgxArray[0].indexOf(abbr.full) === 0 ? rgxArray.index : rgxArray.index + 1
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
              const redundantRgx = new RegExp(`(?:^|[\\s>([])(?<term>${escapeRegExp(abbr.term)}[\\s\\-]${escapeRegExp(lastExpansionWord)})(?:$|[\\s.,<>)\\]:])`, 'gi')
              while ((rgxArray = redundantRgx.exec(contents)) !== null) {
                if (rgxArray.groups?.term) {
                  const startIdx = rgxArray[0].indexOf(abbr.term) === 0 ? rgxArray.index : rgxArray.index + 1
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

            // Check positions / instances
            if (foundLocations.length > 0) {
              const result = { ...abbr }

              const termInstances = foundLocations.filter(fl => fl.type === 'term')
              const fullInstances = foundLocations.filter(fl => fl.type === 'full')
              const redundantInstances = foundLocations.filter(fl => fl.type === 'redundant')

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
                result.redundantTerms = uniq(redundantInstances.map(fl => fl.match))
              }
              results.push(result)
            }

            // Wait for next tick to avoid freezing the progress UI
            await setTimeout()
          }
        } catch (err) {
          vscode.window.showErrorMessage(err.message)
        }
      })

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
        const multiExpansions = results.filter(fl => fl.term === result.term)
        if (multiExpansions.length > 1) {
          if (!multiExpansions.some(me => me.expanded)) {
            if (!multiExpansions.some(me => me.chosen)) {
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
            if (multiExpansions.filter(fl => fl.expanded).length > 1) {
              isIndented = true

              if (!multiExpansions.some(me => me.chosen)) {
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
            resultArr.push(`"${result.full}" used ${result.overusedExpansion + 1} times but never abbreviated as "${result.term}"`)
          } else {
            resultArr.push(`expansion used ${result.overusedExpansion} extra time(s) after initial expansion of "${result.term}"`)
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
          resultArr.push('has redundant word after abbreviation: ' + lf.format(result.redundantTerms.map(t => `"${t}"`)))
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
          outputChannel.appendLine(`\nFound ${idx} abbreviations (${totalWarnings} with ⚠️ warnings).`)
        } else {
          outputChannel.appendLine(`\nFound ${idx} abbreviations.`)
        }
        vscode.window.showInformationMessage(`Found ${idx} abbreviation(s). See Output: DraftForge`)
      }

      outputChannel.show(true)
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
