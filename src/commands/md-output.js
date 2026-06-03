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
async function run(inputContent, outputFileType, outputPathUri) {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Generating ${outputFileType.toUpperCase()} output`,
      cancellable: false
    },
    async () => {
      try {
        // Get temp dir
        const tmpPath = await fs.mkdtemp(path.join(tmpdir(), 'draftforge-'))

        // Write input
        const outputPathUriParts = path.parse(outputPathUri)
        const inputPath = path.join(tmpPath, `${outputPathUriParts.name}.md`)
        const intermediatePath = path.join(tmpPath, `${outputPathUriParts.name}.xml`)
        await fs.writeFile(inputPath, inputContent, 'utf8')

        // Run kramdown-rfc
        const mdExecPath = vscode.workspace
          .getConfiguration('draftforge.kramdown-rfc')
          .get('executablePath')
        const mdFlags = vscode.workspace
          .getConfiguration('draftforge.kramdown-rfc')
          .get(`outputFlags`)
        const mdCmd = `${mdExecPath} ${mdFlags} "${inputPath}" > "${intermediatePath}"`
        await execAsync(mdCmd, {
          timeout: 30000, // 30s
          windowsHide: true
        })

        // Run xml2rfc
        const xmlExecPath = vscode.workspace
          .getConfiguration('draftforge.xml2rfc')
          .get('executablePath')
        const xmlFlags = vscode.workspace
          .getConfiguration('draftforge.xml2rfc')
          .get(`${outputFileType}OutputFlags`)
        const outputFileTypeFlag = outputFileType === 'txt' ? 'text' : outputFileType
        const xmlCmd = `${xmlExecPath} ${xmlFlags} --${outputFileTypeFlag} -o "${outputPathUri}" "${intermediatePath}"`
        await execAsync(xmlCmd, {
          timeout: 30000, // 30s
          windowsHide: true
        })
        vscode.window.showInformationMessage('Document exported successfully.')
        await fs.rm(tmpPath, { recursive: true, force: true })
      } catch (err) {
        vscode.window.showErrorMessage(err.message)
      }
    }
  )
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function registerMdOutputCommand(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'draftforge.mdOutput',
      async function (fileType = 'html', desiredPath) {
        const activeDoc = vscode.window.activeTextEditor?.document

        if (!activeDoc) {
          return vscode.window.showErrorMessage('Open a document first.')
        } else if (activeDoc.uri.scheme === 'output') {
          return vscode.window.showErrorMessage(
            'Focus your desired document first. Focus is currently in the Output window.'
          )
        } else if (activeDoc.languageId !== 'md') {
          return vscode.window.showErrorMessage('Unsupported Document Type.')
        }

        const activeUriPath = path.posix.parse(activeDoc.uri.fsPath)
        const defaultUri = vscode.Uri.parse(
          path.posix.join(activeUriPath.dir, `${activeUriPath.name}.${fileType}`)
        )

        try {
          let chosenPath = ''
          if (desiredPath) {
            chosenPath = desiredPath
          } else {
            const selectedOutputUri = await vscode.window.showSaveDialog({
              title: 'Export As',
              filters: {
                Document: [fileType]
              },
              defaultUri
            })
            chosenPath = selectedOutputUri.fsPath
          }

          if (chosenPath) {
            await run(activeDoc.getText(), fileType, chosenPath)
          }
          return chosenPath
        } catch (err) {
          vscode.window.showErrorMessage(err.message)
        }
      }
    )
  )
}
