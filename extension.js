// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import path from 'node:path'
import { checkIdnits } from './tools/idnits.js'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('DraftForge initialized.')

	// vscode.window.createTreeView('draftforge-checks', {
	// 	treeDataProvider: new 
	// })

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('draftforge.idnits', async function () {

		try {
			const activeFilename = path.parse(vscode.window.activeTextEditor.document.fileName).base
			const results = await checkIdnits(vscode.window.activeTextEditor.document.getText(), activeFilename)
			console.log(results)
			if (results?.length > 0) {
				//TODO: beep boop
			} else {
				vscode.window.showInformationMessage('idnits', {
					detail: 'No nits found on this document.',
					modal: true
				})
			}
		} catch (err) {
			console.warn(err)
			vscode.window.showErrorMessage(err.message)
		}
	})

	context.subscriptions.push(disposable)
}

// This method is called when your extension is deactivated
export function deactivate() {}

