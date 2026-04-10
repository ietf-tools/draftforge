import * as vscode from 'vscode'
import path from 'node:path'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.OutputChannel} outputChannel
 */
export function registerMakeDiffCommand(context, outputChannel) {
  context.subscriptions.push(
    vscode.commands.registerCommand('draftforge.makeDiff', async function () {
      const activeDoc = vscode.window.activeTextEditor?.document
      const workspaceName = vscode.workspace.name

      if (!activeDoc) {
        return vscode.window.showErrorMessage('Open a document first.')
      } else if (activeDoc.uri.scheme === 'output') {
        return vscode.window.showErrorMessage(
          'Focus your desired document first. Focus is currently in the Output window.'
        )
      } else if (!['xml', 'markdown', 'plaintext'].includes(activeDoc.languageId)) {
        return vscode.window.showErrorMessage('Unsupported Document Type.')
      }

      const relativeFileName = path.relative(
        vscode.workspace.workspaceFolders?.at(0)?.uri.fsPath ?? '.',
        activeDoc.fileName
      )

      // Prompt for Comment
      const comment = await vscode.window.showInputBox({
        placeHolder: 'e.g. Clarify introduction section',
        title: 'Version Comment',
        prompt: 'Enter a comment describing this document version.'
      })
      if (!comment) {
        return
      }

      // Confirm prompt
      const confirm = await vscode.window.showInformationMessage(
        `Add currently opened document ${relativeFileName} to the diff session for this repository (${workspaceName}) with comment "${comment}"?`,
        {
          modal: true
        },
        'Proceed'
      )

      if (confirm !== 'Proceed') {
        return
      }

      // Get Auth Session
      const session = await vscode.authentication.getSession('ietf', [], { createIfNone: true })

      if (!session?.accessToken) {
        return vscode.window.showErrorMessage(
          'Failed to obtain authentication token. You must be logged into your IETF Account to continue.'
        )
      }

      const contents = activeDoc.getText()

      // Push to diff
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Adding diff to session',
          cancellable: false
        },
        async (_progress) => {
          try {
            const resp = await fetch('https://diff.rfc-editor.org/api/import/draftforge', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                repo: workspaceName,
                fileName: relativeFileName.split('/').at(-1),
                contents,
                comment
              })
            })
            if (!resp.ok) {
              throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
            }
            const respBody = await resp.json()
            outputChannel.clear()
            outputChannel.appendLine(
              `Document version added to diff session: (this link can be shared with authors)\n\n`
            )
            outputChannel.appendLine(`https://diff.rfc-editor.org/session/repo/${respBody.repo}`)
            outputChannel.show(true)
          } catch (err) {
            console.warn(err)
            vscode.window.showErrorMessage(`Failed to add diff to session: ${err.message}`)
          }
        }
      )
    })
  )
}
