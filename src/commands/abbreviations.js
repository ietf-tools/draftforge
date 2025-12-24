import * as vscode from 'vscode'

const ABBR_URL = "https://github.com/rfc-editor-drafts/common/raw/refs/heads/main/names.json"

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.OutputChannel} outputChannel
 */
export function registerListAbbreviationsCommand (context, outputChannel) {
  let abbr = []

  context.subscriptions.push(vscode.commands.registerCommand('draftforge.listAbbreviations', async function () {
    try {
      const activeDoc = vscode.window.activeTextEditor?.document

      if (!activeDoc) {
        return vscode.window.showErrorMessage('Open a document first.')
      } else if (activeDoc.uri.scheme === 'output') {
        return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
      } else if (!['xml', 'markdown', 'plaintext'].includes(activeDoc.languageId)) {
        return vscode.window.showErrorMessage('Unsupported Document Type.')
      }

      if (abbr.length < 1) {
        const resp = await fetch(ABBR_URL).then(r => r.json())
        if (Array.isArray(resp) && resp?.length > 0) {
          abbr = resp
        } else {
          throw new Error('Failed to fetch abbreviations list from GitHub.')
        }
      }

      const results = [] // TODO:

      outputChannel.clear()
      outputChannel.appendLine(`List of abbreviations usage in ${activeDoc.fileName}:\n`)
      let idx = 0

      for (const key in results) {
        if (idx > 0) {
          outputChannel.appendLine('--------')
        }
        idx++
        const phrase = results[key]
        for (const variation of phrase) {
          outputChannel.appendLine(`${variation.text} (${variation.count})`)
        }
      }

      if (idx === 0) {
        outputChannel.appendLine('No abbreviations found.')
        vscode.window.showInformationMessage('No abbreviations found.')
      } else {
        vscode.window.showInformationMessage(`Found ${idx} abbreviation(s). See Output: DraftForge`)
      }

      outputChannel.show(true)
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
