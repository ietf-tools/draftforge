import * as vscode from 'vscode'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const warnErrRgx = /(.xml\((?<line>[0-9]+)\): )?(?<kind>Warning|Error): (?<msg>.*)/i

/**
 * Run XML2RFC in v2v3 conversion mode
 * @param {String} inputPathUri
 * @param {String} outputPathUri
 * @param outputView
 * @returns {Promise<void>}
 */
async function run(inputPathUri, outputPathUri, outputView) {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Generating RFCXML v3 output',
      cancellable: false
    },
    async () => {
      try {
        // Run xml2rfc
        const execPath = vscode.workspace
          .getConfiguration('draftforge.xml2rfc')
          .get('executablePath')
        const flags = vscode.workspace.getConfiguration('draftforge.xml2rfc').get('v2v3OutputFlags')
        const cmd = `${execPath} --v2v3 ${flags} -o "${outputPathUri}" "${inputPathUri}"`
        const { stderr } = await execAsync(cmd, {
          cwd: path.dirname(inputPathUri),
          timeout: 30000, // 30s
          windowsHide: true
        })

        // Parse stderr output
        let errLines = 0
        for (const line of stderr.split('\n')) {
          const match = line.match(warnErrRgx)
          if (match) {
            errLines++
            if (errLines === 1) {
              outputView.appendHeader('Warnings/Errors from xml2rfc output (RFCXML v3):')
            }
            if (match.groups.line) {
              const lineInt = Math.abs(parseInt(match.groups.line) - 1)
              outputView.appendLineWithRanges({
                text: `- ${match.groups.kind}: ${match.groups.msg}`,
                ranges: [
                  {
                    startLine: lineInt,
                    startCharacter: 0,
                    endLine: lineInt,
                    endCharacter: 0,
                    label: `${match.groups.line}`
                  }
                ]
              })
            } else {
              outputView.appendLine(`- ${match.groups.kind}: ${match.groups.msg}`)
            }
          }
        }
        if (errLines === 0) {
          outputView.appendLine('xml2rfc converted the document without any warning/error.')
        }
        outputView.appendLine(`Saved as ${path.basename(outputPathUri)}`)

        vscode.window.showInformationMessage('Document converted successfully.')
      } catch (err) {
        outputView.appendHeader('Failed to convert to RFCXML v3:')
        outputView.appendLine(err.message)
        vscode.window.showErrorMessage(err.message)
      }
    }
  )
  outputView.reveal()
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function registerXmlV2v3Command(context, outputView) {
  context.subscriptions.push(
    vscode.commands.registerCommand('draftforge.xmlV2v3Output', async function () {
      const activeDoc = vscode.window.activeTextEditor?.document

      if (!activeDoc) {
        return vscode.window.showErrorMessage('Open a document first.')
      } else if (activeDoc.uri.scheme === 'output') {
        return vscode.window.showErrorMessage(
          'Focus your desired document first. Focus is currently in the Output window.'
        )
      } else if (activeDoc.languageId !== 'xml') {
        return vscode.window.showErrorMessage('Unsupported Document Type.')
      } else if (activeDoc.isUntitled || activeDoc.uri.scheme !== 'file') {
        return vscode.window.showErrorMessage('Save the document to disk first.')
      }

      // xml2rfc reads the document from disk, so unsaved changes must be flushed first.
      if (activeDoc.isDirty) {
        const choice = await vscode.window.showWarningMessage(
          'The document must be saved before it can be converted.',
          { modal: true },
          'Save and Continue'
        )
        if (choice !== 'Save and Continue' || !(await activeDoc.save())) {
          return
        }
      }

      const activeUriPath = path.parse(activeDoc.uri.fsPath)
      const outputPath = path.join(activeUriPath.dir, `${activeUriPath.name}.v2v3.xml`)

      outputView.setFileUri(activeDoc.uri)
      outputView.clear()

      try {
        await run(activeDoc.uri.fsPath, outputPath, outputView)
        return outputPath
      } catch (err) {
        vscode.window.showErrorMessage(err.message)
      }
    })
  )
}
