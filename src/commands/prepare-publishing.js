import * as vscode from 'vscode'
import path from 'node:path'
import fs from 'node:fs/promises'
import klaw from 'klaw'

import manifestManager from '../helpers/manifest.js'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.OutputChannel} outputChannel
 */
export function registerPrepareForPublishingCommand (context, outputChannel) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.prepareForPublishing', async function () {
    // Ensure workspace is opened
    if(!vscode.workspace.name || vscode.workspace.workspaceFolders.length < 1) {
      return vscode.window.showErrorMessage('Open a workspace first.')
    } else if (vscode.workspace.workspaceFolders.length > 1) {
      return vscode.window.showErrorMessage('You have more than 1 workspace opened. Cannot work on multiple workspaces at once.')
    }

    const workspaceUri = vscode.workspace.workspaceFolders.at(0).uri

    // Prompt for RFC Number
    const rfcNumber = await vscode.window.showInputBox({
      placeHolder: 'e.g. 1234',
      title: 'Enter the RFC number to prepare:',
      validateInput: (value) => {
        if (!value.match(/^[0-9]+$/)) {
          return 'Not a valid RFC number'
        }
      }
    })

    const manifest = await manifestManager.getManifest(workspaceUri.fsPath)

    // Prompt for overwrite
    if (manifest.publications?.length > 0) {
      const overwritePrompt = await vscode.window.showQuickPick([
        { label: 'No, cancel operation', picked: true, value: 'no' },
        { label: 'Yes, overwrite', value: 'yes' }
      ], {
        ignoreFocusOut: true,
        title: 'The manifest already contains publication info. Overwrite?'
      })
      if (overwritePrompt.value !== 'yes') {
        return
      }
    }

    outputChannel.clear()
    outputChannel.show(true)

    // Scan workspace for files
    const includedFiles = []
    for await (const fl of klaw(workspaceUri.fsPath, { depthLimit: 1 })) {
      if (fl.stats.isFile()) {
        const filePath = path.posix.parse(fl.path)
        const filePathRelative = path.relative(workspaceUri.fsPath, fl.path)
        const fileType = filePath.ext.slice(1)
        if (filePath.name === `rfc${rfcNumber}` && ['html', 'pdf', 'txt', 'xml'].includes(fileType)) {
          // Ensure RFC number consistency
          if (fileType === 'xml') {
            try {
              const xmlContents = await fs.readFile(fl.path, 'utf8')
              const rfcNumberMatch = xmlContents.match(/<rfc[^>]+?number="(?<rfcNumber>[0-9]+)"/)
              if (!rfcNumberMatch?.groups?.rfcNumber || rfcNumberMatch.groups?.rfcNumber !== rfcNumber) {
                outputChannel.appendLine(`Operation canceled.`)
                return vscode.window.showErrorMessage(`RFC number mismatch in ${filePathRelative}`, { modal: true })
              }
            } catch (err) {
              outputChannel.appendLine(`Operation canceled.`)
              return vscode.window.showErrorMessage(`Failed to read ${filePathRelative}: ${err.message}`, { modal: true })
            }
          }

          // Add to list
          includedFiles.push({
            path: filePathRelative,
            type: fileType
          })
          outputChannel.appendLine(`Adding ${filePathRelative}`)
        } else if (filePath.name === `rfc${rfcNumber}.notprepped` && fileType === 'xml') {
          includedFiles.push({
            path: filePathRelative,
            type: 'notprepped'
          })
          outputChannel.appendLine(`Adding ${filePathRelative}`)
        }
      }
    }

    if (includedFiles.length < 1) {
      return outputChannel.appendLine(`⚠️ No suitable file candidates found. Looked for **/rfc${rfcNumber}.{html,pdf,txt,xml} and **/rfc${rfcNumber}.notprepped.xml`)
    }

    // Add to manifest
    await manifestManager.updateManifest(workspaceUri.fsPath, 'publications', [{
      rfcNumber: parseInt(rfcNumber),
      files: includedFiles
    }], true)

    outputChannel.appendLine(`\nAdded ${includedFiles.length} files to manifest.`)
  }))
}
