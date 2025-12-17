import * as vscode from 'vscode'

export function registerAuthCommands (context) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.login', async function () {
    try {
      const session = await vscode.authentication.getSession('ietf', [], { createIfNone: true })
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
