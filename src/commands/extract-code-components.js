import * as vscode from 'vscode'
import { posix } from 'node:path'

const EXTRACT_DIR = 'code-extracts'

export function registerExtractCodeComponentsCommand (context) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.extractCodeComponents', async function () {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      return vscode.window.showInformationMessage('Open a document first.')
    }

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

    try {
      const doc = editor.document
      const workspacePath = vscode.workspace.getWorkspaceFolder(doc.uri).uri.fsPath

      const codeRgx = /<sourcecode ?(?<attr>[a-z0-9=@\.\-_ "]+)?>\n?(?<code>[\s\S]+?)\n?<\/sourcecode>/gmi
      const contents = doc.getText()

      const output = vscode.window.createOutputChannel('DraftForge')
      output.clear()
      output.appendLine(`Code components extracted from ${doc.fileName}:\n`)
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
          codeFileName = `${posix.parse(doc.fileName).name}-${noNameIdx}`
          noNameIdx++
        }
        if (!codeFileName.includes('.')) {
          if (codeType) {
            codeFileName = `${codeFileName}.${codeType}`
          } else {
            codeFileName = `${codeFileName}.txt`
          }
        }

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

        output.appendLine(`- ./${EXTRACT_DIR}/${codeFileName}`)
        idx++
      }
      idx--

      if (idx <= 0) {
        output.appendLine('No code components found.')
        vscode.window.showInformationMessage('No code components found.')
      } else {
        output.appendLine(`\n${idx - 1} code components extracted to ./${EXTRACT_DIR}`)
        vscode.window.showInformationMessage(`Found ${idx - 1} code component(s). See Output: DraftForge`)
      }

      output.show(true)
    } catch (err) {
      console.log(err)
      vscode.window.showErrorMessage(`Something went wrong: ${err.message}`)
    }
  }))
}
