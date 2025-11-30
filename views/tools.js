import * as vscode from 'vscode'
import { posix } from 'node:path'

class ToolsProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event

    this.tools = [
      { id: 'extractComments', label: 'Extract [rfced] comments', description: 'List all comments for the RPC staff', icon: 'comment' },
      { id: 'extractCodeComponents', label: 'Extract Code Components', description: 'List all sourcecode blocks', icon: 'file-code' },
      { id: 'formatDocument', label: 'Format Document', description: 'Reformat document and fix indentation', icon: 'list-flat' },
      { id: 'openPreview', label: 'Open Preview', description: 'Open a preview for the current draft', icon: 'open-preview' },
      { id: 'exportPdf', label: 'Export as PDF', description: 'Export the current draft to PDF', icon: 'file-pdf' },
      { id: 'addXmlModels', label: 'Add XML Models', description: 'Download and add RelaxNG schema files to the document directory', icon: 'cloud-download' },
      { id: 'stripMLineEndings', label: 'Strip ^M Line Endings', description: 'Clean Document from ^M Line Endings', icon: 'no-newline' }
    ]
  }

  refresh() {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(tool) {
    const item = new vscode.TreeItem(tool.label, vscode.TreeItemCollapsibleState.None)
    item.description = tool.description
    item.iconPath = new vscode.ThemeIcon(tool.icon ?? 'tools')
    item.command = {
      command: 'draftforge.runTool',
      title: 'Run Tool',
      arguments: [tool]
    }
    item.contextValue = tool.id
    return item
  }

  getChildren() {
    return this.tools
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function activateToolsView (context) {
  const toolsProvider = new ToolsProvider()
  const toolsView = vscode.window.createTreeView('draftforge-tools', { treeDataProvider: toolsProvider })
  context.subscriptions.push(toolsView)

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.runTool', async (tool) => {
    try {
      if (!vscode.window.activeTextEditor) {
        return vscode.window.showInformationMessage('No active editor to run tools on.')
      }

      const doc = vscode.window.activeTextEditor.document
      switch (tool.id) {
        case 'extractComments': {
          const commentsRgx = /<!-- \[rfced\]([^]+?)-->/gmi
          const contents = doc.getText()

          const output = vscode.window.createOutputChannel('DraftForge')
          output.clear()
          output.appendLine(`List of comments for the RPC staff in ${doc.fileName}:\n`)
          let idx = 0

          for (const match of contents.matchAll(commentsRgx)) {
            if (idx > 0) {
              output.appendLine('\n--------\n')
            }
            idx++
            output.appendLine(`${idx}. ${match[1].trim()}`)
          }

          if (idx === 0) {
            output.appendLine('No [rfced] mentions found.')
            vscode.window.showInformationMessage('No [rfced] mentions found.')
          } else {
            vscode.window.showInformationMessage(`Found ${idx} [rfced] mention(s). See Output: DraftForge`)
          }

          output.show(true)
          break
        }
        case 'extractCodeComponents': {
          //TODO:
          vscode.window.showInformationMessage('Not yet implemented.')
          break
        }
        case 'formatDocument':
          await vscode.commands.executeCommand('editor.action.formatDocument')
          break
        case 'openPreview':
          // try Markdown preview or show a message if unsupported
          if (doc.languageId === 'markdown') {
            await vscode.commands.executeCommand('markdown.showPreview')
          } else {
            vscode.window.showInformationMessage('Preview not available for this document type.')
          }
          break
        case 'exportPdf':
          vscode.window.showInformationMessage('Export to PDF not implemented yet.')
          break
        case 'addXmlModels':
          const editor = vscode.window.activeTextEditor
          if (!editor) {
            return vscode.window.showInformationMessage('Open an XML document first.')
          }

          // Fetch schemas

          try {
            const dirPath = posix.dirname(editor.document.uri.toString())
            const rfc7991bisContent = await fetch('https://github.com/ietf-tools/RFCXML/raw/main/rfc7991bis.rnc')
            await vscode.workspace.fs.writeFile(vscode.Uri.parse(posix.join(dirPath, 'rfc7991bis.rnc')), new Uint8Array(await rfc7991bisContent.arrayBuffer()))
            const svg12rfcContent = await fetch('https://github.com/ietf-tools/RFCXML/raw/main/SVG-1.2-RFC.rnc')
            await vscode.workspace.fs.writeFile(vscode.Uri.parse(posix.join(dirPath, 'SVG-1.2-RFC.rnc')), new Uint8Array(await svg12rfcContent.arrayBuffer()))
          } catch (err) {
            return vscode.window.showErrorMessage(`Failed to download schemas to disk: ${err.message}`)
          }

          // Add reference to XML document

          let replaceOccured = false
          for (let i = 0; i < doc.lineCount; i++) {
            const line = doc.lineAt(i)
            if (line.text.startsWith('<?xml-model')) {
              await editor.edit(editBuilder => {
                editBuilder.replace(line.range, '<?xml-model href="rfc7991bis.rnc"?>')
              })
              replaceOccured = true
            }
          }

          if (replaceOccured) {
            vscode.window.showInformationMessage('Schemas downloaded and existing <?xml-model> updated successfully.')
          } else {
            await editor.edit(editBuilder => {
              editBuilder.insert(
                new vscode.Position(doc.lineAt(0).text.startsWith('<?xml ') ? 1 : 0, 0),
                '<?xml-model href="rfc7991bis.rnc"?>\n'
              )
            })
            vscode.window.showInformationMessage('Schemas downloaded and <?xml-model> added successfully.')
          }
          break
        case 'stripMLineEndings': {
          const editor = vscode.window.activeTextEditor
          if (!editor) return

          const ranges = []
          for (let i = 0; i < doc.lineCount; i++) {
            const text = doc.lineAt(i).text
            if (text.endsWith('^4')) {
              const start = new vscode.Position(i, text.length - 2)
              const end = new vscode.Position(i, text.length)
              ranges.push(new vscode.Range(start, end))
            }
          }

          if (ranges.length === 0) {
            vscode.window.showInformationMessage('No ^4 line endings found.')
          } else {
            // delete from bottom to top to avoid shifting positions
            ranges.sort((a, b) => b.start.line - a.start.line || b.start.character - a.start.character)
            await editor.edit(editBuilder => {
              for (const range of ranges) {
                editBuilder.delete(range)
              }
            })
            vscode.window.showInformationMessage(`Stripped ${ranges.length} ^4 line ending(s).`)
          }
          break
        }
        default:
          vscode.window.showWarningMessage(`Unknown tool: ${tool.id}`)
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))

  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => toolsProvider.refresh()))
}