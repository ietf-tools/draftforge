import * as vscode from 'vscode'
import { get, merge, set, uniq } from 'lodash-es'
import crypto from 'node:crypto'

import manifestManager from '../helpers/manifest.js'

import { registerCheckArticlesCommand } from '../commands/articles.js'
import { registerCheckHyphenationCommand } from '../commands/hyphenation.js'
import { registerCheckPlaceholdersCommand } from '../commands/placeholders.js'
import { registerCheckInclusiveLanguageCommand } from '../commands/inclusive-language.js'
import { registerCheckNamesCommand } from '../commands/names.js'
import { registerCheckNonAsciiCommand } from '../commands/non-ascii.js'
import { registerCheckRepeatedWordsCommand } from '../commands/repeated-words.js'
import { registerCheckTyposCommand } from '../commands/typos.js'
import { registerCheckRfcTermsCommand } from '../commands/rfc-terms.js'

const ignores = {}

class CheckItem {
  /**
   * @param {String} id
   * @param {String} label
   * @param {String} description
   * @param {String} icon
   */
  constructor (id, label, description, icon) {
    this.id = id
    this.label = label
    this.description = description
    this.icon = icon
  }
}

class ChecksProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event

    this.checks = [
      new CheckItem('articles', 'Articles Check', 'Check for bad indefinite articles usage', 'repo'),
      new CheckItem('hyphenation', 'Hyphenation Check', 'Check for inconsistent hyphenation usage', 'diff-removed'),
      new CheckItem('inclusiveLanguage', 'Inclusive Language Check', 'Check for usage of non-inclusive terms', 'heart'),
      new CheckItem('names', 'Names Check', 'Check for author names preferences', 'account'),
      new CheckItem('nonAscii', 'Non-ASCII Check', 'Check for non-ASCII characters', 'symbol-key'),
      new CheckItem('placeholders', 'Placeholders Check', 'Check for common placeholders', 'bracket'),
      new CheckItem('rfcTerms', 'RFC-specific Terms Check', 'Check for RFC-specific terms usage', 'coffee'),
      new CheckItem('repeatedWords', 'Repeated Words Check', 'Check for accidental repeated terms', 'layers'),
      new CheckItem('typos', 'Typos Check', 'Check for common typos', 'debug')
    ]
  }

  refresh() {
    this._onDidChangeTreeData.fire()
  }

  /**
   *
   * @param {CheckItem} check
   * @returns {vscode.TreeItem}
   */
  getTreeItem(check) {
    const item = new vscode.TreeItem(check.label, vscode.TreeItemCollapsibleState.None)
    item.description = `> ${check.description}`
    item.tooltip = check.description
    item.iconPath = new vscode.ThemeIcon(check.icon ?? 'debug-alt')
    item.command = {
      command: 'draftforge.runCheck',
      title: 'Run Check',
      arguments: [check]
    }
    item.contextValue = check.id
    return item
  }

  getChildren() {
    return this.checks
  }
}

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 */
export async function activateChecksView (context, diagnosticCollection) {
    const checksProvider = new ChecksProvider()
    const checksView = vscode.window.createTreeView('draftforge-checks', { treeDataProvider: checksProvider })
    context.subscriptions.push(checksView)

    // Checks
    registerCheckArticlesCommand(context, diagnosticCollection, ignores)
    registerCheckHyphenationCommand(context, diagnosticCollection, ignores)
    registerCheckInclusiveLanguageCommand(context, diagnosticCollection, ignores)
    registerCheckNamesCommand(context, diagnosticCollection, ignores)
    registerCheckNonAsciiCommand(context, diagnosticCollection)
    registerCheckPlaceholdersCommand(context, diagnosticCollection, ignores)
    registerCheckRepeatedWordsCommand(context, diagnosticCollection, ignores)
    registerCheckRfcTermsCommand(context, diagnosticCollection, ignores)
    registerCheckTyposCommand(context, diagnosticCollection, ignores)

    // Run Single Check
    context.subscriptions.push(vscode.commands.registerCommand('draftforge.runCheck', async (check, clearFirst = true) => {
      try {
        const activeDoc = vscode.window.activeTextEditor?.document
        if (!activeDoc) {
          return vscode.window.showErrorMessage('No active editor to run check on.')
        } else if (activeDoc.uri.scheme === 'output') {
          return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
        }

        switch (check.id) {
          case 'articles':
            await vscode.commands.executeCommand('draftforge.checkArticles', clearFirst)
            break
          case 'hyphenation':
            await vscode.commands.executeCommand('draftforge.checkHyphenation', clearFirst)
            break
          case 'inclusiveLanguage':
            await vscode.commands.executeCommand('draftforge.checkInclusiveLanguage', clearFirst)
            break
          case 'names':
            await vscode.commands.executeCommand('draftforge.checkNames', clearFirst)
            break
          case 'nonAscii':
            await vscode.commands.executeCommand('draftforge.checkNonAscii', clearFirst)
            break
          case 'placeholders':
            await vscode.commands.executeCommand('draftforge.checkPlaceholders', clearFirst)
            break
          case 'rfcTerms':
            await vscode.commands.executeCommand('draftforge.checkRfcTerms', clearFirst)
            break
          case 'repeatedWords':
            await vscode.commands.executeCommand('draftforge.checkRepeatedWords', clearFirst)
            break
          case 'typos':
            await vscode.commands.executeCommand('draftforge.checkTypos', clearFirst)
            break
          default:
            vscode.window.showWarningMessage(`Unknown check: ${check.id}`)
        }
      } catch (err) {
        console.warn(err)
        vscode.window.showErrorMessage(err.message)
      }
    }))

    // Run All Checks
    context.subscriptions.push(vscode.commands.registerCommand('draftforge.runAllChecks', async () => {
      try {
        const activeDoc = vscode.window.activeTextEditor?.document
        if (!activeDoc) {
          return vscode.window.showErrorMessage('No active editor to run checks on.')
        } else if (activeDoc.uri.scheme === 'output') {
          return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
        }

        const checks = Array.isArray(checksProvider?.checks) ? checksProvider.checks : []
        if (checks.length === 0) {
          return vscode.window.showInformationMessage('No checks configured.')
        }

        diagnosticCollection.clear()

        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'DraftForge — Running all checks',
          cancellable: false
        }, async (progress) => {
          for (let i = 0; i < checks.length; i++) {
            const check = checks[i]
            progress.report({ message: `Running ${check.label}...`, increment: 100 / checks.length })
            // delegate to the single-check command so existing logic is reused
            await vscode.commands.executeCommand('draftforge.runCheck', check, false)
          }
        })

        vscode.window.showInformationMessage(`Completed running ${checks.length} checks.`)
      } catch (err) {
        console.warn(err)
        vscode.window.showErrorMessage(err.message)
      }
    }))

    // Code Action - Ignore this warning
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider('xml', {
      provideCodeActions (document, range, _context, _token) {
        const codeActions = []
        const diags = diagnosticCollection.get(document.uri)
        if (diags?.length > 0) {
          for (const diag of diags) {
            // @ts-ignore
            if(diag.match && diag.range.contains(range)) {
              // Repo scope
              const actRepo = new vscode.CodeAction('Ignore warnings of this term across the repo', vscode.CodeActionKind.QuickFix)
              actRepo.diagnostics = [diag]
              actRepo.command = {
                title: 'Ignore this warning',
                command: 'draftforge.ignoreWarning',
                arguments: ['repo', document.uri, diag]
              }
              codeActions.push(actRepo)

              // Document scope
              const actDoc = new vscode.CodeAction('Ignore warnings of this term for this document only', vscode.CodeActionKind.QuickFix)
              actDoc.diagnostics = [diag]
              actDoc.command = {
                title: 'Ignore this warning',
                command: 'draftforge.ignoreWarning',
                arguments: ['doc', document.uri, diag]
              }
              codeActions.push(actDoc)
            }
          }
        }
        return codeActions
      }
    }))

    // Ignore warning
    context.subscriptions.push(vscode.commands.registerCommand('draftforge.ignoreWarning', async (scope = 'repo', documentUri, diag) => {
      try {
        const workspacePath = vscode.workspace.getWorkspaceFolder(documentUri).uri.fsPath

        // Add to editor ignores
        const currentIgnoreValues = get(ignores[documentUri.toString()], diag.code, [])
        currentIgnoreValues.push(diag.match)
        set(ignores[documentUri.toString()], diag.code, uniq(currentIgnoreValues))

        // Add to ignore list in manifest
        const manifest = await manifestManager.getManifest(workspacePath)

        const documentPath = documentUri.fsPath.replace(`${workspacePath}/`, '')
        const documentPathHash = crypto.createHash('md5').update(documentPath).digest('hex')
        const ignorePath = `draftforge.ignores.${scope === 'repo' ? 'global' : documentPathHash}.${diag.code}`

        const manifestIgnores = get(manifest, ignorePath, [])
        manifestIgnores.push(diag.match)
        manifestManager.updateManifest(workspacePath, ignorePath, uniq(manifestIgnores), true)

        // Remove from active diagnotics collection
        const diags = diagnosticCollection.get(documentUri)
        diagnosticCollection.set(documentUri, diags.filter(d => d !== diag))
      } catch (err) {
        console.warn(err)
        vscode.window.showErrorMessage(err.message)
      }
    }))

    // Load ignores when opening document
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(async doc => {
      if (doc.uri.scheme === 'file') {
        loadIgnoresForDocument(doc.uri)
      }
    }))

    // Load ignores for currently opened docs
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.uri.scheme === 'file') {
        loadIgnoresForDocument(doc.uri)
      }
    }
}

/**
 * Load ignores for document
 * @param {vscode.Uri} docUri Document URI
 */
async function loadIgnoresForDocument (docUri) {
  const workspacePath = vscode.workspace.getWorkspaceFolder(docUri).uri.fsPath
  const documentPath = docUri.fsPath.replace(`${workspacePath}/`, '')
  const documentPathHash = crypto.createHash('md5').update(documentPath).digest('hex')

  const manifest = await manifestManager.getManifest(workspacePath)
  ignores[docUri.toString()] = get(manifest, 'draftforge.ignores.global', {})
  ignores[docUri.toString()] = merge(ignores[docUri.toString()], get(manifest, `draftforge.ignores.${documentPathHash}`, {}))
}
