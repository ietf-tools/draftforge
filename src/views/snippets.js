import * as vscode from 'vscode'

class SnippetsProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event

    this.snippets = [
      {
        id: 'xmlAuthorBlock',
        label: 'Author Block',
        description: 'Insert an author block',
        body: '<author fullname="${1:Full Name}" initials="${2:Initials}" surname="${3:Surname}">\n\t<organization>${4:Organization}</organization>\n\t\t<address>\n\t\t\t<postal>\n\t\t\t\t<country>${5:Country Name}</country>\n\t\t\t</postal>\n\t\t\t<email>${6:Email Address}</email>\n\t</address>\n</author>'
      },
      {
        id: 'xmlDateElement',
        label: 'Date Element',
        description: 'Insert a date element',
        body: '<date day="${1:DD}" month="${2:Month}" year="${3:YYYY}" />'
      },
      {
        id: 'fencedCode',
        label: 'Fenced Code Block',
        description: 'Insert a fenced code block',
        // use tildes to avoid embedding triple-backticks in this file
        body: '~~~${1:language}\n${2:code}\n~~~\n'
      },
      {
        id: 'mdTable',
        label: 'Simple Markdown Table',
        description: 'Insert a simple markdown table',
        body: '| Col1 | Col2 |\n| --- | --- |\n| ${1:cell1} | ${2:cell2} |\n'
      }
    ]
  }

  refresh() {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(snippet) {
    const item = new vscode.TreeItem(snippet.label, vscode.TreeItemCollapsibleState.None)
    item.description = snippet.description
    item.iconPath = new vscode.ThemeIcon('symbol-method')
    item.command = {
      command: 'draftforge.insertSnippet',
      title: 'Insert Snippet',
      arguments: [snippet]
    }
    item.contextValue = snippet.id
    return item
  }

  getChildren() {
    return this.snippets
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function activateSnippetsView (context) {
  const snippetsProvider = new SnippetsProvider()
  const snippetsView = vscode.window.createTreeView('draftforge-snippets', { treeDataProvider: snippetsProvider })
  context.subscriptions.push(snippetsView)

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.insertSnippet', async (snippet) => {
    try {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        return vscode.window.showInformationMessage('No active editor to insert snippet into.')
      }
      const snippetString = new vscode.SnippetString(snippet.body || '')
      await editor.insertSnippet(snippetString, editor.selection.start)
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))

  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => snippetsProvider.refresh()))
}