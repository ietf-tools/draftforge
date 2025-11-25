import * as vscode from 'vscode'

export function registerSetupCommands (context) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.login', async function () {
    try {
      await vscode.env.openExternal(vscode.Uri.parse('https://account.ietf.org'))
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.register', async function () {
    try {
      vscode.commands.executeCommand('setContext', 'draftforge.isSetup', true)
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}