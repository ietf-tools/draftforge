import * as vscode from 'vscode'

export function registerAuthCommands (context) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.login', async function () {
    try {
      const session = await vscode.authentication.getSession('ietf', [], { forceNewSession: true })
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.register', async function () {
    try {
      vscode.env.openExternal(vscode.Uri.parse('https://datatracker.ietf.org/accounts/create/'))
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
