import * as vscode from 'vscode'

import { registerIdnitsCommand } from './commands/idnits.js'
import { activateChecksView } from './views/checks.js'
import { activateToolsView } from './views/tools.js'
import { activateSnippetsView } from './views/snippets.js'
import { registerSetupCommands } from './commands/setup.js'
import { registerCheckArticlesCommand } from './commands/articles.js'
import { registerCheckPlaceholdersCommand } from './commands/placeholders.js'

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context) {
	console.log('Initializing DraftForge...')

	// Register Diagnostic Collection
	let diagnosticCollection
	diagnosticCollection = vscode.languages.createDiagnosticCollection('draftforgeChecks')
	context.subscriptions.push(diagnosticCollection)

	registerSetupCommands(context)
	registerCheckArticlesCommand(context, diagnosticCollection)
	registerCheckPlaceholdersCommand(context, diagnosticCollection)
	registerIdnitsCommand(context, diagnosticCollection)

	activateChecksView(context, diagnosticCollection)
	activateToolsView(context)
	activateSnippetsView(context)

	vscode.commands.executeCommand('setContext', 'draftforge.isReady', true)
	console.log('DraftForge initialized.')
}

export function deactivate() {}

