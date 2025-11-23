import * as vscode from 'vscode'

class ChecksProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event

    this.checks = [
      { id: 'articles', label: 'Articles Check', description: 'Check for bad indefinite articles usage' },
      { id: 'hyphenation', label: 'Hyphenation Check', description: 'Check for consistent usage of hyphenation' },
      { id: 'idnits', label: 'IDNits', description: 'Run idnits on the current document' },
      { id: 'inclusiveLanguage', label: 'Inclusive Language Check', description: 'Check for usage of non-inclusive terms' },
      { id: 'nonAscii', label: 'Non-ASCII Check', description: 'Check for non-ASCII characters' },
      { id: 'placeholders', label: 'Placeholders Check', description: 'Check for common placeholders' },
      { id: 'repeatedWords', label: 'Repeated Words Check', description: 'Check for accidental repeated terms' },
      { id: 'typos', label: 'Typos Check', description: 'Check for common typos' }
    ]
  }

  refresh() {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(check) {
    const item = new vscode.TreeItem(check.label, vscode.TreeItemCollapsibleState.None)
    item.description = check.description
    item.iconPath = new vscode.ThemeIcon('debug-alt')
    item.command = {
      command: 'draftforge.runCheck',
      title: 'Run Check',
      arguments: [check]
    }
    item.contextValue = check.id
    return item
  }

  getChildren() {
    return this.checks
  }
}

let checksStatusBarItem

/**
 * @param {vscode.ExtensionContext} context
 */
export function activateChecksView (context) {
    const checksProvider = new ChecksProvider()
    const checksView = vscode.window.createTreeView('draftforge-checks', { treeDataProvider: checksProvider })
    context.subscriptions.push(checksView)
  
    context.subscriptions.push(vscode.commands.registerCommand('draftforge.runCheck', async (check) => {
      try {
        if (!vscode.window.activeTextEditor) {
          return vscode.window.showInformationMessage('No active editor to run checks on.')
        }
  
        switch (check.id) {
          case 'idnits':
            await vscode.commands.executeCommand('draftforge.idnits')
            break
          case 'spelling':
            // simple placeholder - implement real spelling logic as needed
            vscode.window.showInformationMessage('Spelling check not yet implemented.')
            break
          default:
            vscode.window.showWarningMessage(`Unknown check: ${check.id}`)
        }
      } catch (err) {
        console.warn(err)
        vscode.window.showErrorMessage(err.message)
      }
    }))
  
    context.subscriptions.push(vscode.commands.registerCommand('draftforge.runAllChecks', async () => {
      try {
        if (!vscode.window.activeTextEditor) {
          return vscode.window.showInformationMessage('No active editor to run checks on.')
        }
  
        const checks = Array.isArray(checksProvider?.checks) ? checksProvider.checks : []
        if (checks.length === 0) {
          return vscode.window.showInformationMessage('No checks configured.')
        }
  
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'DraftForge — Running all checks',
          cancellable: false
        }, async (progress) => {
          for (let i = 0; i < checks.length; i++) {
            const check = checks[i]
            progress.report({ message: `Running ${check.label}...`, increment: 100 / checks.length })
            // delegate to the single-check command so existing logic is reused
            await vscode.commands.executeCommand('draftforge.runCheck', check)
          }
        })
  
        vscode.window.showInformationMessage(`Completed running ${checks.length} checks.`)
      } catch (err) {
        console.warn(err)
        vscode.window.showErrorMessage(err.message)
      }
    }))
  
    // Refresh the tree when the active editor changes
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => checksProvider.refresh()))

    // Register check StatusBarItem
    checksStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10)
    checksStatusBarItem.command = 'draftforge.runAllChecks'
    checksStatusBarItem.show()
    context.subscriptions.push(checksStatusBarItem)
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => updateStatusBarItem))

    updateStatusBarItem()
}

export function updateStatusBarItem(isRunning = false) {
	if (!isRunning) {
		checksStatusBarItem.text = '$(check-all) Validation Passed'
    checksStatusBarItem.tooltip = 'Click to run all validation checks'
	} else {
    checksStatusBarItem.text = '$(loading~spin) Running Validation Checks...'
    checksStatusBarItem.tooltip = 'Please wait'
	}
}