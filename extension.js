import * as vscode from 'vscode'

import { registerIdnitsCommand } from './commands/idnits.js'
import { activateChecksView } from './views/checks.js'
import { activateToolsView } from './views/tools.js'
import { activateSnippetsView } from './views/snippets.js'

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context) {
	console.log('Initializing DraftForge...')

	registerIdnitsCommand(context)

	activateChecksView(context)
	activateToolsView(context)
	activateSnippetsView(context)

	console.log('DraftForge initialized.')
}

export function deactivate() {}

