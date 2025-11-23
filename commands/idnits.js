import * as vscode from 'vscode'
import { checkNits, MODES } from '@ietf-tools/idnits'
import { Buffer } from 'node:buffer'
import path from 'node:path'

export async function checkIdnits (text, filename, mode = MODES.NORMAL, offline = false) {
  const enc = new TextEncoder()
  // convert to Node Buffer expected by checkNits
  return checkNits(Buffer.from(enc.encode(text)), filename, {
    mode,
    offline
  })
}

export function registerIdnitsCommand (context) {
  
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('draftforge.idnits', async function () {
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
	}))
}