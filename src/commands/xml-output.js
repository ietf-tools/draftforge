import * as vscode from 'vscode'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'

const execAsync = promisify(exec)

/**
 * Run XML2RFC
 * @param {String} inputContent
 * @param {String} outputFileType
 * @param {String} outputPathUri
 * @returns {Promise<void>}
 */
async function run (inputContent, outputFileType, outputPathUri) {
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Generating ${outputFileType.toUpperCase()} output`,
    cancellable: false
  }, async () => {
    try {
      // Get temp dir
      const tmpPath = await fs.mkdtemp(path.join(tmpdir(), 'draftforge-'))
      const now = Date.now().toString()

      // Write input
      const inputPath = path.join(tmpPath, `${now}.xml`)
      await fs.writeFile(inputPath, inputContent, 'utf8')

      // Run xml2rfc
      const execPath = vscode.workspace.getConfiguration('draftforge.xml2rfc').get('executablePath')
      const flags = vscode.workspace.getConfiguration('draftforge.xml2rfc').get(`${outputFileType}OutputFlags`)
      const outputFileTypeFlag = (outputFileType === 'txt') ? 'text' : outputFileType
      const cmd = `${execPath} ${flags} --${outputFileTypeFlag} -o "${outputPathUri}" "${inputPath}"`
      await execAsync(cmd, {
        timeout: 30000, // 30s
        windowsHide: true
      })
      vscode.window.showInformationMessage('Document exported successfully.')
      await fs.rm(tmpPath, { recursive: true, force: true })
    } catch (err) {
      vscode.window.showErrorMessage(err.message)
    }
  })
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function registerXmlOutputCommand (context) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.xmlOutput', async function (fileType = 'html') {
    const activeDoc = vscode.window.activeTextEditor?.document

    if (!activeDoc) {
      return vscode.window.showErrorMessage('Open a document first.')
    } else if (activeDoc.uri.scheme === 'output') {
      return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
    } else if (activeDoc.languageId !== 'xml') {
      return vscode.window.showErrorMessage('Unsupported Document Type.')
    }

    const activeUriPath = path.posix.parse(activeDoc.uri.fsPath)
    const defaultUri = vscode.Uri.parse(path.posix.join(activeUriPath.dir, `${activeUriPath.name}.${fileType}`))

    try {
      const selectedOutputUri = await vscode.window.showSaveDialog({
        title: 'Export As',
        filters: {
          'Document': [fileType]
        },
        defaultUri
      })
      if (selectedOutputUri) {
        await run(activeDoc.getText(), fileType, selectedOutputUri.fsPath)
      }
    } catch (err) {
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
