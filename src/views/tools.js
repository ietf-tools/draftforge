import * as vscode from 'vscode'

class ToolsProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event

    this.tools = [
      { id: 'addXmlModels', label: 'Add XML Models', description: 'Download and add RelaxNG schema files to the document directory', icon: 'cloud-download' },
      { id: 'exportHtml', label: 'Export as HTML', description: 'Generate HTML output of the current document', icon: 'file-symlink-file' },
      { id: 'exportPdf', label: 'Export as PDF', description: 'Generate PDF output of the current document', icon: 'file-pdf' },
      { id: 'exportTxt', label: 'Export as TXT', description: 'Generate TXT output of the current document', icon: 'file-text' },
      { id: 'extractComments', label: 'Extract [rfced] comments', description: 'List all comments for the RPC staff', icon: 'comment' },
      { id: 'extractCodeComponents', label: 'Extract Code Components', description: 'List all sourcecode blocks', icon: 'file-code' },
      { id: 'formatDocument', label: 'Format Document', description: 'Reformat document and fix indentation', icon: 'list-flat' },
      { id: 'idnits', label: 'IDNits', description: 'Run idnits on the current document', icon: 'tasklist' },
      { id: 'openPreview', label: 'Open Preview', description: 'Open a preview of the current document', icon: 'open-preview' },
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
        case 'addXmlModels':
          await vscode.commands.executeCommand('draftforge.addXmlModels')
          break
        case 'exportPdf':
          vscode.window.showInformationMessage('Export to PDF not implemented yet.')
          break
        case 'extractCodeComponents': {
          vscode.window.showInformationMessage('Not yet implemented.')
          break
        }
        case 'extractComments': {
          await vscode.commands.executeCommand('draftforge.extractComments')
          break
        }
        case 'formatDocument':
          await vscode.commands.executeCommand('editor.action.formatDocument')
          break
        case 'idnits':
          await vscode.commands.executeCommand('draftforge.idnits')
          break
        case 'openPreview':
          // try Markdown preview or show a message if unsupported
          if (doc.languageId === 'markdown') {
            await vscode.commands.executeCommand('markdown.showPreview')
          } else {
            vscode.window.showInformationMessage('Preview not available for this document type.')
          }
          break
        case 'stripMLineEndings': {
          await vscode.commands.executeCommand('draftforge.stripMLineEndings')
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
