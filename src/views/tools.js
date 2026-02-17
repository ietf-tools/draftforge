import * as vscode from 'vscode'

class ToolsProvider {
  constructor(context) {
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event

    this.populateTools()

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(ev => {
      if (ev.affectsConfiguration('draftforge.experience')) {
        this.populateTools()
        this.refresh()
      }
    }))

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(_ev => {
      this.populateTools()
      this.refresh()
    }))
  }

  populateTools() {
    const flags = {
      rpc: vscode.workspace.getConfiguration('draftforge').get('experience') === 'rpc',
      xml: vscode.window.activeTextEditor?.document.languageId === 'xml',
      md: vscode.window.activeTextEditor?.document.languageId === 'markdown'
    }

    this.tools = [
      flags.xml && { id: 'addXmlModels', label: 'Add XML Models', description: 'Download and add RelaxNG schema files to the document directory', icon: 'cloud-download' },
      { id: 'exportHtml', label: 'Export as HTML', description: 'Generate HTML output of the current document', icon: 'file-symlink-file' },
      { id: 'exportPdf', label: 'Export as PDF', description: 'Generate PDF output of the current document', icon: 'file-pdf' },
      { id: 'exportTxt', label: 'Export as TXT', description: 'Generate TXT output of the current document', icon: 'file-text' },
      flags.rpc && { id: 'extractComments', label: 'Extract [rfced] Comments', description: 'List all comments for the RPC staff', icon: 'comment' },
      { id: 'extractCodeComponents', label: 'Extract Code Components', description: 'Extract all or some sourcecode blocks', icon: 'file-code' },
      { id: 'formatDocument', label: 'Format Document', description: 'Reformat document and fix indentation', icon: 'list-flat' },
      { id: 'idnits', label: 'IDNits', description: 'Run idnits on the current document', icon: 'tasklist' },
      { id: 'abbreviations', label: 'List Abbreviations', description: 'List abbreviation expansion usage', icon: 'whole-word' },
      { id: 'inconsistentCapitalization', label: 'List Inconsistent Capitalization', description: 'List inconsistent use of capitalization', icon: 'case-sensitive' },
      { id: 'inconsistentFormatting', label: 'List Inconsistent Formatting', description: 'List inconsistent formatting like bold, italics, etc.', icon: 'paintcan' },
      { id: 'lookupSelectionAcrossDocs', label: 'Lookup Selection Across Docs', description: 'In opened documents', icon: 'search' },
      { id: 'openPreview', label: 'Open Preview', description: 'Open a preview of the current document', icon: 'open-preview' },
      flags.rpc && { id: 'prepareForPublishing', label: 'Prepare for Publishing', description: 'Ensure repository is ready for publishing', icon: 'mortar-board' },
      { id: 'stripMLineEndings', label: 'Strip ^M Line Endings', description: 'Clean Document from ^M Line Endings', icon: 'no-newline' },
      { id: 'surroundBcp14Keywords', label: 'Surround BCP 14 Keywords', description: 'Ensure all BCP 14 keywords are enclosed with <bcp14> tags', icon: 'bold' },
      flags.xml && { id: 'svgcheck', label: 'SVG Check', description: 'Validate SVGs in the current document', icon: 'circuit-board' }
    ].filter(t => t)
  }

  refresh() {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(tool) {
    const item = new vscode.TreeItem(tool.label, vscode.TreeItemCollapsibleState.None)
    item.description = `> ${tool.description}`
    item.tooltip = tool.description
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
  const toolsProvider = new ToolsProvider(context)
  const toolsView = vscode.window.createTreeView('draftforge-tools', { treeDataProvider: toolsProvider })
  context.subscriptions.push(toolsView)

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.runTool', async (tool) => {
    try {
      if (!vscode.window.activeTextEditor) {
        return vscode.window.showInformationMessage('No active editor to run tools on.')
      }

      const doc = vscode.window.activeTextEditor.document
      switch (tool.id) {
        case 'abbreviations': {
          await vscode.commands.executeCommand('draftforge.listAbbreviations')
          break
        }
        case 'addXmlModels': {
          await vscode.commands.executeCommand('draftforge.addXmlModels')
          break
        }
        case 'exportHtml': {
          if (doc.languageId === 'xml') {
            await vscode.commands.executeCommand('draftforge.xmlOutput', 'html')
          } else if (doc.languageId === 'markdown') {
            await vscode.window.showInformationMessage('Export to HTML from Markdown not implemented yet.')
          } else {
            await vscode.window.showInformationMessage('Export to HTML not available for this document type.')
          }
          break
        }
        case 'exportPdf': {
          if (doc.languageId === 'xml') {
            await vscode.commands.executeCommand('draftforge.xmlOutput', 'pdf')
          } else if (doc.languageId === 'markdown') {
            await vscode.window.showInformationMessage('Export to PDF from Markdown not implemented yet.')
          } else {
            await vscode.window.showInformationMessage('Export to PDF not available for this document type.')
          }
          break
        }
        case 'exportTxt': {
          if (doc.languageId === 'xml') {
            await vscode.commands.executeCommand('draftforge.xmlOutput', 'txt')
          } else if (doc.languageId === 'markdown') {
            await vscode.window.showInformationMessage('Export to TXT from Markdown not implemented yet.')
          } else {
            await vscode.window.showInformationMessage('Export to TXT not available for this document type.')
          }
          break
        }
        case 'extractCodeComponents': {
          await vscode.commands.executeCommand('draftforge.extractCodeComponents')
          break
        }
        case 'extractComments': {
          await vscode.commands.executeCommand('draftforge.extractComments')
          break
        }
        case 'formatDocument': {
          await vscode.commands.executeCommand('editor.action.formatDocument')
          break
        }
        case 'idnits': {
          let selectedMode = 'normal'
          const defaultMode = vscode.workspace.getConfiguration('draftforge.idnits').get('mode')
          if (defaultMode === 'prompt') {
            const selectedModeRaw = await vscode.window.showQuickPick([
              { label: 'Normal', picked: true, value: 'normal' },
              { label: 'Forgive Checklist', value: 'forgive' },
              { label: 'Submission', value: 'submission' }
            ], {
              ignoreFocusOut: true,
              title: 'Select Validation Mode'
            })
            selectedMode = selectedModeRaw?.value || 'normal'
          } else {
            selectedMode = defaultMode || 'normal'
          }
          await vscode.commands.executeCommand('draftforge.idnits', selectedMode)
          break
        }
        case 'inconsistentCapitalization': {
          await vscode.commands.executeCommand('draftforge.listInconsistentCapitalization')
          break
        }
        case 'inconsistentFormatting': {
          await vscode.commands.executeCommand('draftforge.listInconsistentFormatting')
          break
        }
        case 'lookupSelectionAcrossDocs': {
          await vscode.commands.executeCommand('draftforge.lookupSelectionAcrossDocs')
          break
        }
        case 'openPreview': {
          if (doc.languageId === 'xml') {
            await vscode.commands.executeCommand('draftforge.xmlPreview')
          } else if (doc.languageId === 'markdown') {
            await vscode.commands.executeCommand('markdown.showPreviewToSide')
          } else {
            vscode.window.showInformationMessage('Preview not available for this document type.')
          }
          break
        }
        case 'prepareForPublishing': {
          await vscode.commands.executeCommand('draftforge.prepareForPublishing')
          break
        }
        case 'stripMLineEndings': {
          await vscode.commands.executeCommand('draftforge.stripMLineEndings')
          break
        }
        case 'surroundBcp14Keywords': {
          await vscode.commands.executeCommand('draftforge.surroundBcp14Keywords')
          break
        }
        case 'svgcheck': {
          if (doc.languageId === 'xml') {
            await vscode.commands.executeCommand('draftforge.svgcheck')
          } else {
            vscode.window.showInformationMessage('Document must be XML or SVG.')
          }
          break
        }
        default: {
          vscode.window.showWarningMessage(`Unknown tool: ${tool.id}`)
        }
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))

  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => toolsProvider.refresh()))
}
