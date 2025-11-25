import * as vscode from 'vscode'

import { registerIdnitsCommand } from './commands/idnits.js'
import { activateChecksView } from './views/checks.js'
import { activateToolsView } from './views/tools.js'
import { activateSnippetsView } from './views/snippets.js'
import { registerSetupCommands } from './commands/setup.js'

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context) {
	console.log('Initializing DraftForge...')

	vscode.commands.executeCommand('setContext', 'draftforge.isSetup', false)

	registerSetupCommands(context)
	registerIdnitsCommand(context)

	activateChecksView(context)
	activateToolsView(context)
	activateSnippetsView(context)

	console.log('DraftForge initialized.')
}

export function deactivate() {}

