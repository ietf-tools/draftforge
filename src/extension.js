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
// import { registerMakeDiffCommand } from './commands/make-diff.js'
import { registerPrepareForPublishingCommand } from './commands/prepare-publishing.js'
import { registerStripMLineEndingsCommand } from './commands/strip-mline-endings.js'
import { registerSurroundBcp14KeywordsCommand } from './commands/surround-bcp14-keywords.js'
import { registerSvgcheckCommand } from './commands/svgcheck.js'
import { registerXmlOutputCommand } from './commands/xml-output.js'
import { registerXmlPreviewCommand, unregisterXmlPreviewCommand } from './commands/xml-preview.js'
import { registerMdOutputCommand } from './commands/md-output.js'
import { OutputWebviewView } from './views/neue-output.js'
import { registerNewFileCommand } from './commands/new-file.js'

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context) {
  console.log('Initializing DraftForge...')

  // Create DraftForge Output View
  let outputView = new OutputWebviewView()
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('draftforge.outputView', outputView)
  )

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
  registerExtractCodeComponentsCommand(context, outputView)
  registerExtractCommentsCommand(context, outputView)
  registerIdnitsCommand(context)
  registerListAbbreviationsCommand(context, outputView)
  registerListInconsistentCapitalizationCommand(context, outputView)
  registerListInconsistentFormattingCommand(context, outputView)
  registerLookupSelectionAcrossDocsCommand(context, outputView)
  // registerMakeDiffCommand(context, outputView)
  registerMdOutputCommand(context, outputView)
  registerNewFileCommand(context)
  registerPrepareForPublishingCommand(context, outputView)
  registerStripMLineEndingsCommand(context)
  registerSurroundBcp14KeywordsCommand(context, outputView)
  registerSvgcheckCommand(context, diagnosticCollection)
  registerXmlOutputCommand(context, outputView)
  registerXmlPreviewCommand(context, outputView)

  // Activate views
  void activateChecksView(context, diagnosticCollection)
  activateToolsView(context, outputView)
  activateSnippetsView(context)
  activateReferenceView(context)

  // Extension is ready
  vscode.commands.executeCommand('setContext', 'draftforge.isReady', true)
  console.log('DraftForge initialized.')
}

export function deactivate() {
  unregisterXmlPreviewCommand()
}
