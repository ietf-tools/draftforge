import * as vscode from 'vscode'

import { IetfAuthenticationProvider } from './authentication/ietf.js'
import { registerIdnitsCommand } from './commands/idnits.js'
import { activateChecksView } from './views/checks.js'
import { activateToolsView } from './views/tools.js'
import { activateSnippetsView } from './views/snippets.js'
import { activateReferenceView } from './views/reference.js'
import { registerAddXmlModelsCommand } from './commands/add-xml-models.js'
import { registerAuthCommands } from './commands/auth.js'
import { registerExpandIncludesCommands } from './commands/expand-includes.js'
import { registerExtractCodeComponentsCommand } from './commands/extract-code-components.js'
import { registerExtractCommentsCommand } from './commands/extract-comments.js'
import { registerListAbbreviationsCommand } from './commands/abbreviations.js'
import { registerListInconsistentCapitalizationCommand } from './commands/inconsistent-capitalization.js'
import { registerListInconsistentFormattingCommand } from './commands/inconsistent-formatting.js'
import { registerLookupSelectionAcrossDocsCommand } from './commands/lookup-selection-across-docs.js'
import { registerStripMLineEndingsCommand } from './commands/strip-mline-endings.js'
import { registerSurroundBcp14KeywordsCommand } from './commands/surround-bcp14-keywords.js'
import { registerSvgcheckCommand } from './commands/svgcheck.js'
import { registerXmlOutputCommand } from './commands/xml-output.js'
import { registerXmlPreviewCommand, unregisterXmlPreviewCommand } from './commands/xml-preview.js'
import { registerPrepareForPublishingCommand } from './commands/prepare-publishing.js'

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context) {
	console.log('Initializing DraftForge...')

  // Create DraftForge Output channel
  let outputChannel = vscode.window.createOutputChannel('DraftForge')
  context.subscriptions.push(outputChannel)

	// Register Diagnostic Collection
	let diagnosticCollection = vscode.languages.createDiagnosticCollection('draftforgeChecks')
	context.subscriptions.push(diagnosticCollection)

  // Register auth provider
  context.subscriptions.push(new IetfAuthenticationProvider(context))

  // Register commands
  // -> Note: Validation checks commands are registered in the Checks view
	registerAddXmlModelsCommand(context)
  registerAuthCommands(context)
  registerExpandIncludesCommands(context)
  registerExtractCodeComponentsCommand(context, outputChannel)
	registerExtractCommentsCommand(context, outputChannel)
	registerIdnitsCommand(context)
  registerListAbbreviationsCommand(context, outputChannel)
  registerListInconsistentCapitalizationCommand(context, outputChannel)
  registerListInconsistentFormattingCommand(context, outputChannel)
  registerLookupSelectionAcrossDocsCommand(context, outputChannel)
  registerPrepareForPublishingCommand(context, outputChannel)
	registerStripMLineEndingsCommand(context)
  registerSurroundBcp14KeywordsCommand(context)
  registerSvgcheckCommand(context, diagnosticCollection)
  registerXmlOutputCommand(context)
  registerXmlPreviewCommand(context, outputChannel)

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

