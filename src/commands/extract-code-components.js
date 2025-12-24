import * as vscode from 'vscode'
import { posix } from 'node:path'

const EXTRACT_DIR = 'code-extracts'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.OutputChannel} outputChannel
 */
export function registerExtractCodeComponentsCommand (context, outputChannel) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.extractCodeComponents', async function () {
    const activeDoc = vscode.window.activeTextEditor?.document

    if (!activeDoc) {
      return vscode.window.showErrorMessage('Open a document first.')
    } else if (activeDoc.uri.scheme === 'output') {
      return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
    } else if (!['xml', 'markdown'].includes(activeDoc.languageId)) {
      return vscode.window.showErrorMessage('Unsupported Document Type.')
    }

    // -> Prompt the user for types to include
    const includeTypesPrompt = await vscode.window.showQuickPick([
      { label: 'All code components of any type', picked: true, value: 'all' },
      { label: 'ABNF', value: 'abnf' },
      { label: 'MIB', value: 'mib' },
      { label: 'YANG', value: 'yang|yangtree' },
      { label: 'XML', value: 'xml' }
    ], {
      ignoreFocusOut: true,
      title: 'Which code components to extract?',
      placeHolder: 'Choose...'
    })

    if (!includeTypesPrompt?.value) {
      vscode.window.showInformationMessage('Action cancelled by user.')
      return
    }
    const includeTypes = includeTypesPrompt.value.split('|')

    // -> Process document
    try {
      const workspacePath = vscode.workspace.getWorkspaceFolder(activeDoc.uri).uri.fsPath

      const codeRgx = /<sourcecode ?(?<attr>[a-z0-9=@\.\-_ "]+)?>\n?(?<code>[\s\S]+?)\n?<\/sourcecode>/gmi
      const contents = activeDoc.getText()

      outputChannel.clear()
      outputChannel.appendLine(`Code components extracted from ${activeDoc.fileName}:\n`)
      let idx = 1
      let noNameIdx = 1

      for (const match of contents.matchAll(codeRgx)) {
        // -> Ensure output directory exists
        if (idx <= 1) {
          await vscode.workspace.fs.createDirectory(vscode.Uri.parse(posix.join(workspacePath, EXTRACT_DIR)))
        }

        // -> Build filename
        let codeFileName = null
        let codeType = null
        if (match.groups?.attr) {
          const reName = /name="(?<name>.+?)"/i
          const reType = /type="(?<type>.+?)"/i
          codeFileName = match.groups.attr.match(reName)?.groups?.name?.trim()
          codeType = match.groups.attr.match(reType)?.groups?.type?.trim()
        }
        if (!codeFileName) {
          codeFileName = `${posix.parse(activeDoc.fileName).name}-${noNameIdx}`
          noNameIdx++
        }
        if (!codeFileName.includes('.')) {
          if (codeType) {
            codeFileName = `${codeFileName}.${codeType}`
          } else {
            codeFileName = `${codeFileName}.txt`
          }
        }

        // -> Ensure type is allowed
        if (!includeTypes.includes('all')) {
          let isAllowed = false
          for (const allowedType of includeTypes) {
            if (codeType && codeType.toLowerCase() === allowedType) {
              isAllowed = true
            } else if (codeFileName.toLowerCase().endsWith(`.${allowedType}`)) {
              isAllowed = true
            }
          }
          if (!isAllowed) {
            continue
          }
        }

        // -> Export code to disk
        await vscode.workspace.fs.writeFile(vscode.Uri.parse(posix.join(workspacePath, EXTRACT_DIR, codeFileName)), new TextEncoder().encode(match.groups?.code || ''))

        outputChannel.appendLine(`- ./${EXTRACT_DIR}/${codeFileName}`)
        idx++
      }
      idx--

      if (idx <= 0) {
        outputChannel.appendLine('No code components found.')
        vscode.window.showInformationMessage('No code components found.')
      } else {
        outputChannel.appendLine(`\n${idx - 1} code components extracted to ./${EXTRACT_DIR}`)
        vscode.window.showInformationMessage(`Found ${idx - 1} code component(s). See Output: DraftForge`)
      }

      outputChannel.show(true)
    } catch (err) {
      console.log(err)
      vscode.window.showErrorMessage(`Something went wrong: ${err.message}`)
    }
  }))
}
