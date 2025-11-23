import * as vscode from 'vscode'

class ToolsProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event

    this.tools = [
      { id: 'extractComments', label: 'Extract [rfced] comments', description: 'List all comments for the RPC staff' },
      { id: 'extractCodeComponents', label: 'Extract Code Components', description: 'List all sourcecode blocks' },
      { id: 'formatDocument', label: 'Format Document', description: 'Reformat document and fix indentation' },
      { id: 'openPreview', label: 'Open Preview', description: 'Open a preview for the current draft' },
      { id: 'exportPdf', label: 'Export as PDF', description: 'Export the current draft to PDF' },
      { id: 'stripMLineEndings', label: 'Strip ^M Line Endings', description: 'Clean Document from ^M Line Endings' }
    ]
  }

  refresh() {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(tool) {
    const item = new vscode.TreeItem(tool.label, vscode.TreeItemCollapsibleState.None)
    item.description = tool.description
    item.iconPath = new vscode.ThemeIcon('tools')
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
        case 'wordCount': {
          const text = doc.getText()
          const words = (text.match(/\b\w+\b/g) || []).length
          const chars = text.length
          vscode.window.showInformationMessage(`Words: ${words} — Characters: ${chars}`, { modal: false })
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
        case 'idnits':
          await vscode.commands.executeCommand('draftforge.idnits')
          break
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