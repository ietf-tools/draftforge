import * as vscode from 'vscode'
import { checkNits, MODES, ValidationError, ValidationComment, ValidationWarning } from '@ietf-tools/idnits'
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
/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 */
export function registerIdnitsCommand (context, diagnosticCollection) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('draftforge.idnits', async function (clearFirst = true) {
		if (clearFirst) {
			diagnosticCollection.clear()
		}

		try {
			const activeUri = vscode.window.activeTextEditor.document.uri
			const activeFilename = path.parse(vscode.window.activeTextEditor.document.fileName).base
			const results = await checkIdnits(vscode.window.activeTextEditor.document.getText(), activeFilename)
			if (results?.length > 0) {
				diagnosticCollection.set(activeUri, results.map(nit => {
					let severity = vscode.DiagnosticSeverity.Warning
					if (nit instanceof ValidationWarning) {
						severity = vscode.DiagnosticSeverity.Warning
					} else if (nit instanceof ValidationComment) {
						severity = vscode.DiagnosticSeverity.Information
					} else if (nit instanceof ValidationError) { // must be last, as other types extend ValidationError
						severity = vscode.DiagnosticSeverity.Error
					} else {
						console.warn('idnits - Invalid nit type: ', nit)
					}
					let range = null
					if (nit.lines?.length > 0) {
						range = new vscode.Range(nit.lines[0].line, nit.lines[0].pos, nit.lines[0].line, Number.MAX_VALUE)
					} else {
						range = new vscode.Range(0, 0, 0, Number.MAX_VALUE)
					}
					return new vscode.Diagnostic(range, nit.message, severity)
				}))
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