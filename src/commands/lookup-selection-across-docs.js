import * as vscode from 'vscode'

/**
 * @param {vscode.ExtensionContext} context
 */
export function registerLookupSelectionAcrossDocsCommand (context) {
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('draftforge.lookupSelectionAcrossDocs', async (editor, _edit) => {
    const selection = editor.selection
    if (selection.isEmpty) {
      vscode.window.showInformationMessage('Select some text first.')
      return
    }

    const text = editor.document.getText(selection)
    const output = vscode.window.createOutputChannel('DraftForge')
    output.clear()
    const foundDocs = []

    // -> Ensure all tabs are loaded in memory.
    // -> VS Code doesn't hydrate all documents until they are focused at least once.
    for (const tabGroup of vscode.window.tabGroups.all) {
      for (const tab of tabGroup.tabs) {
        if (tab.input instanceof vscode.TabInputText) {
          try {
            const doc = await vscode.workspace.openTextDocument(tab.input.uri)

            // -> Check for selection match
            if (doc.uri !== editor.document.uri && doc.uri.scheme === 'file') {
              if (doc.getText().includes(text)) {
                foundDocs.push(doc.fileName)
              }
            }
          } catch (err) {
            console.error(`Could not open document: ${tab.input.uri.toString()}`, err)
          }
        }
      }
    }

    // -> Display the results
    if (foundDocs.length > 0) {
      output.appendLine('The selected text below was found in these documents:\n')
      output.appendLine(`- ${editor.document.fileName} (source)`)
      for (const fileName of foundDocs) {
        output.appendLine(`- ${fileName}`)
      }
      output.appendLine('')
    } else {
      output.appendLine('The selected text below was NOT found in any of the other opened documents.\n')
    }
    output.appendLine('--------------------------------')
    output.appendLine(text)
    output.show(true)
  }))
}
