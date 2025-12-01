import * as vscode from 'vscode'

class ReferenceProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event

    this.refs = [
      {
        id: 'general',
        label: 'General',
        description: 'Content guidelines',
        kind: 'format',
        children: []
      },
      {
        id: 'markdown',
        label: 'Markdown',
        description: 'kramdown-rfc',
        kind: 'format',
        children: []
      },
      {
        id: 'RFCXMLv3',
        label: 'RFCXML',
        description: 'v3',
        kind: 'format',
        children: [
          {
            id: 'lists',
            label: 'Lists',
            kind: 'topic',
            children: []
          },
          {
            id: 'references',
            label: 'References',
            kind: 'topic',
            children: []
          },
          {
            id: 'vocabulary',
            label: 'Vocabulary',
            kind: 'topic',
            children: [
              {
                id: 'abstract',
                label: 'abstract',
                tooltip: 'Contains the Abstract of the document.'
              },
              {
                id: 'address',
                label: 'address',
                tooltip: 'Provides address information for the author.'
              },
              {
                id: 'annotation',
                label: 'annotation',
                tooltip: 'Provides additional prose augmenting a bibliographic reference.'
              },
              {
                id: 'area',
                label: 'area',
                tooltip: 'Provides information about the IETF area to which this document relates (currently not used when generating documents).'
              }
            ]
          }
        ]
        
      },
    ]
  }

  refresh() {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(ref) {
    let itemCollapsibleState = vscode.TreeItemCollapsibleState.None
    let itemIconPath = null
    switch (ref.kind) {
      case 'format':
        itemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded
        itemIconPath = new vscode.ThemeIcon('library')
        break
      case 'topic':
        itemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed
        itemIconPath = new vscode.ThemeIcon('notebook')
        break
      default:
        itemIconPath = new vscode.ThemeIcon('info')
        break
    }
    const item = new vscode.TreeItem(ref.label, itemCollapsibleState)
    item.description = ref.description ?? false
    item.tooltip = ref.tooltip
    item.iconPath = itemIconPath
    if (!ref.children) {
      item.command = {
        command: 'vscode.open',
        title: 'View Reference',
        arguments: [vscode.Uri.parse(`https://authors.ietf.org/en/rfcxml-vocabulary#${ref.id}`)]
      }
    }
    item.contextValue = ref.id
    return item
  }

  getChildren(item) {
    return item ? item.children : this.refs
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function activateReferenceView (context) {
  const referenceProvider = new ReferenceProvider()
  const referenceView = vscode.window.createTreeView('draftforge-reference', { treeDataProvider: referenceProvider })
  context.subscriptions.push(referenceView)

  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => referenceProvider.refresh()))
}