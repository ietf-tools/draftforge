import * as vscode from 'vscode'
import { getAllValidations, MODES, ValidationError, ValidationComment, ValidationWarning } from '@ietf-tools/idnits'
import { Buffer } from 'node:buffer'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

function getLoadingContent(scriptUri, cssUri) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>idnits</title>
    <link rel="stylesheet" href="${cssUri}">
</head>
<body>
  <div id="app">Loading...</div>
  <script type="text/javascript" src="${scriptUri}"></script>
</body>
</html>`;
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function registerIdnitsCommand (context) {
  let resultsPanel = null

  const jsDiskPath = vscode.Uri.joinPath(context.extensionUri, 'media/webviews/idnits', 'app.js')
  const cssDiskPath = vscode.Uri.joinPath(context.extensionUri, 'media/webviews/idnits', 'app.css')

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.idnits', async function () {
    try {
      const activeDoc = vscode.window.activeTextEditor.document
      const activeFilename = path.parse(activeDoc.fileName).base
      const enc = new TextEncoder()
      const results = []
      const resultGroups = []
      let nitsTotal = 0
      const nitsByType = {
        error: 0,
        warning: 0,
        comment: 0
      }

      // Setup webview

      if (!resultsPanel) {
        resultsPanel = vscode.window.createWebviewPanel(
          'idnitsResults',
          `IDNits Results - ${activeFilename}`,
          vscode.ViewColumn.Two,
          {
            enableScripts: true,
            retainContextWhenHidden: true
          }
        )
        resultsPanel.onDidDispose(() => {
          resultsPanel = null
        })
        resultsPanel.webview.onDidReceiveMessage(msg => {
          console.log(msg)
        })
      }

      const jsSrc = resultsPanel.webview.asWebviewUri(jsDiskPath)
      const cssSrc = resultsPanel.webview.asWebviewUri(cssDiskPath)
      resultsPanel.webview.html = getLoadingContent(jsSrc, cssSrc)

      // Create context
      const ext = activeFilename.endsWith('.xml') ? 'xml' : 'txt'
      const ctx = {
        raw: Buffer.from(enc.encode(activeDoc.getText())),
        filename: activeFilename,
        options: {
          mode: MODES.NORMAL,
          offline: false,
          year: new Date().getFullYear()
        }
      }

      // Show progress notification
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Running idnits',
        cancellable: false
      }, async (progress) => {
        try {
          const validations = getAllValidations(ext)

          // Calculate progress increment
          let totalTasks = 0
          for (const valGroup of validations) {
            totalTasks += valGroup.tasks.length
          }
          const progressIncrement = Math.floor(100 / totalTasks)

          // Validate document
          let grpIdx = 0
          let taskIdx = 0
          for (const valGroup of validations) {
            performance.mark(`${valGroup.key}_start`)
            if (valGroup.condition && !valGroup.condition(ctx)) {
              continue
            }
            resultGroups.push({
              key: valGroup.key,
              title: valGroup.title,
              tasks: [],
              nitsTotal: 0,
              perf: '-',
              state: 'pending'
            })
            for (const valTask of valGroup.tasks) {
              performance.mark(`${valTask.key}_start`)
              progress.report({ message: `${valTask.title}...`, increment: progressIncrement })
              try {
                const taskObj = {
                  key: valTask.key,
                  title: valTask.title,
                  nits: [],
                  group: grpIdx,
                  perf: '-',
                  state: 'pending'
                }
                resultGroups[grpIdx].tasks.push(taskObj)
                results.push(taskObj)
                const taskResults = await valTask.task(ctx)
                if (!valTask.isVoid && Array.isArray(taskResults)) {
                  results[taskIdx].nits.push(...taskResults)
                  resultGroups[grpIdx].nitsTotal += taskResults.length

                  nitsTotal++
                  for (const nit of taskResults) {
                    if (nit instanceof ValidationComment) {
                      nitsByType.comment++
                    } else if (nit instanceof ValidationError) {
                      nitsByType.error++
                    } else if (nit instanceof ValidationWarning) {
                      nitsByType.warning++
                    }
                  }
                }
                results[taskIdx].state = 'completed'
              } catch (err) {
                results[taskIdx].state = 'failed'
                resultGroups[grpIdx].state = 'failed'
                throw err
              }
              performance.mark(`${valTask.key}_end`)
              results[taskIdx].perf = +performance.measure(valTask.key, `${valTask.key}_start`, `${valTask.key}_end`).duration.toFixed(2)
              taskIdx++
            }
            performance.mark(`${valGroup.key}_end`)
            resultGroups[grpIdx].perf = +performance.measure(valGroup.key, `${valGroup.key}_start`, `${valGroup.key}_end`).duration.toFixed(2)
            resultGroups[grpIdx].state = 'completed'
            grpIdx++
          }
        } catch (err) {
          vscode.window.showErrorMessage(err.message)
        }
      })

      // Show results
      if (results?.length > 0) {
        resultsPanel.webview.postMessage({
          command: 'results',
          results: resultGroups
        })
        vscode.window.showInformationMessage(`Found ${nitsTotal} nits. See the results pane for details.`)
      } else {
        vscode.window.showInformationMessage('idnits', {
          detail: 'No nits found on this document.',
          modal: true
        })
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
