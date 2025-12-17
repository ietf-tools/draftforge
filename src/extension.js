import * as vscode from 'vscode'

import { IetfAuthenticationProvider } from './authentication/ietf.js'
import { registerIdnitsCommand } from './commands/idnits.js'
import { activateChecksView } from './views/checks.js'
import { activateToolsView } from './views/tools.js'
import { activateSnippetsView } from './views/snippets.js'
import { activateReferenceView } from './views/reference.js'
import { registerAddXmlModelsCommand } from './commands/add-xml-models.js'
import { registerAuthCommands } from './commands/auth.js'
import { registerCheckArticlesCommand } from './commands/articles.js'
import { registerCheckHyphenationCommand } from './commands/hyphenation.js'
import { registerCheckPlaceholdersCommand } from './commands/placeholders.js'
import { registerCheckInclusiveLanguageCommand } from './commands/inclusive-language.js'
import { registerCheckNonAsciiCommand } from './commands/non-ascii.js'
import { registerCheckRepeatedWordsCommand } from './commands/repeated-words.js'
import { registerCheckTyposCommand } from './commands/typos.js'
import { registerExtractCommentsCommand } from './commands/extract-comments.js'
import { registerStripMLineEndingsCommand } from './commands/strip-mline-endings.js'
import { registerSvgcheckCommand } from './commands/svgcheck.js'
import { registerXmlOutputCommand } from './commands/xml-output.js'
import { registerXmlPreviewCommand, unregisterXmlPreviewCommand } from './commands/xml-preview.js'

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context) {
	console.log('Initializing DraftForge...')

	// Register Diagnostic Collection
	let diagnosticCollection
	diagnosticCollection = vscode.languages.createDiagnosticCollection('draftforgeChecks')
	context.subscriptions.push(diagnosticCollection)

  // Register auth provider
  context.subscriptions.push(new IetfAuthenticationProvider(context))

  // Register commands
	registerAddXmlModelsCommand(context)
  registerAuthCommands(context)
	registerCheckArticlesCommand(context, diagnosticCollection)
	registerCheckHyphenationCommand(context, diagnosticCollection)
	registerCheckInclusiveLanguageCommand(context, diagnosticCollection)
	registerCheckNonAsciiCommand(context, diagnosticCollection)
	registerCheckPlaceholdersCommand(context, diagnosticCollection)
	registerCheckRepeatedWordsCommand(context, diagnosticCollection)
	registerCheckTyposCommand(context, diagnosticCollection)
	registerExtractCommentsCommand(context)
	registerIdnitsCommand(context)
	registerStripMLineEndingsCommand(context)
  registerSvgcheckCommand(context, diagnosticCollection)
  registerXmlOutputCommand(context)
  registerXmlPreviewCommand(context)

  // Activate views
	activateChecksView(context, diagnosticCollection)
	activateToolsView(context)
	activateSnippetsView(context)
	activateReferenceView(context)

  // Extension is ready
	vscode.commands.executeCommand('setContext', 'draftforge.isReady', true)
	console.log('DraftForge initialized.')
}

export function deactivate() {
  unregisterXmlPreviewCommand()
}

