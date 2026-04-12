import * as vscode from 'vscode'

class SnippetsProvider {
  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event

    this.populateSnippets()

    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((_ev) => {
        this.populateSnippets()
        this.refresh()
      })
    )
  }

  populateSnippets() {
    const currentLanguage = vscode.window.activeTextEditor?.document.languageId
    this.snippets = [
      {
        id: 'xmlAuthorBlock',
        label: 'Author Block',
        description: 'Insert an author block',
        body: '<author fullname="${1:Full Name}" initials="${2:Initials}" surname="${3:Surname}">\n\t<organization>${4:Organization}</organization>\n\t\t<address>\n\t\t\t<postal>\n\t\t\t\t<country>${5:Country Name}</country>\n\t\t\t</postal>\n\t\t\t<email>${6:Email Address}</email>\n\t</address>\n</author>',
        targetLanguage: 'xml'
      },
      {
        id: 'xmlDateElement',
        label: 'Date Element',
        description: 'Insert a date element',
        body: '<date day="${1:$CURRENT_DATE}" month="${2:$CURRENT_MONTH_NAME}" year="${3:$CURRENT_YEAR}" />',
        targetLanguage: 'xml'
      },
      {
        id: 'xmlTable',
        label: 'Table',
        description: 'Insert a custom table',
        body: () => {
          return generateXmlTable()
        },
        targetLanguage: 'xml'
      },
      {
        id: 'xmlGenericRefBlock',
        label: 'Reference - Generic',
        description: 'Insert a generic reference block',
        body: '<reference anchor="${1:Citation Tag}" target="${2:URL}">\n\t<front>\n\t\t<title>${3:Title}</title>\n\t\t<author initials="" surname="" fullname="">\n\t\t\t<organization />\n\t\t</author>\n\t\t<date month="${4:$CURRENT_MONTH_NAME}" year="${5:$CURRENT_YEAR}"/>\n\t</front>\n\t<seriesInfo name="${6:Name}" value="${7:Value}"/>\n\t<seriesInfo name="DOI" value="${8:Value}"/>\n</reference>',
        targetLanguage: 'xml'
      },
      {
        id: 'xmlRfcRefBlock',
        label: 'Reference - RFC',
        description: 'Insert an RFC reference block',
        body: '<reference anchor="RFC${1:YYYY}" target="https://www.rfc-editor.org/info/rfc${1:YYYY}">\n\t<front>\n\t\t<title>${2:Title}</title>\n\t\t<author initials="" surname="" fullname="">\n\t\t\t<organization />\n\t\t</author>\n\t\t<date month="${3:$CURRENT_MONTH_NAME}" year="${4:$CURRENT_YEAR}"/>\n\t</front>\n\t<seriesInfo name="RFC" value="${1:YYYY}"/>\n\t<seriesInfo name="DOI" value="10.17487/RFC${1:YYYY}"/>\n</reference>',
        targetLanguage: 'xml'
      },
      {
        id: 'fencedCode',
        label: 'Fenced Code Block',
        description: 'Insert a fenced code block',
        // use tildes to avoid embedding triple-backticks in this file
        body: '~~~${1:language}\n${2:code}\n~~~\n',
        targetLanguage: 'markdown'
      },
      {
        id: 'mdTable',
        label: 'Simple Markdown Table',
        description: 'Insert a simple markdown table',
        body: '| Col1 | Col2 |\n| --- | --- |\n| ${1:cell1} | ${2:cell2} |\n',
        targetLanguage: 'markdown'
      }
    ].filter((s) => s.targetLanguage === currentLanguage)
  }

  refresh() {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(snippet) {
    const item = new vscode.TreeItem(snippet.label, vscode.TreeItemCollapsibleState.None)
    item.description = `> ${snippet.description}`
    item.tooltip = snippet.description
    item.iconPath = new vscode.ThemeIcon('symbol-method')
    item.command = {
      command: 'draftforge.insertSnippet',
      title: 'Insert Snippet',
      arguments: [snippet]
    }
    item.contextValue = snippet.id
    return item
  }

  getChildren() {
    return this.snippets
  }
}

/**
 * Generate a table by prompting the user for header, columns and rows count
 * @returns {Promise<String>} Snippet Body
 */
async function generateXmlTable() {
  const includeHeaders = await vscode.window.showQuickPick(
    [
      { label: 'Yes, include a header row', picked: true, value: 'yes' },
      { label: "No, don't include a header row", value: 'no' }
    ],
    {
      ignoreFocusOut: true,
      title: 'Include a table header row?',
      placeHolder: 'Choose...'
    }
  )
  if (!includeHeaders) {
    return
  }
  const columnsStr = await vscode.window.showInputBox({
    title: 'How many columns to generate?',
    value: '4'
  })
  if (!columnsStr) {
    return
  }
  const cols = parseInt(columnsStr)
  const rowsStr = await vscode.window.showInputBox({
    title: 'How many rows to generate?',
    value: '3'
  })
  if (!rowsStr) {
    return
  }
  const rows = parseInt(rowsStr)

  let output = `<table>\n`
  let placeholderIdx = 1
  if (includeHeaders.value === 'yes') {
    output += `  <thead>\n    <tr>\n${repeatWithIndex('      <th>${IDX:Header IDX Name}</th>\n', cols, placeholderIdx)}    </tr>\n  </thead>\n`
    placeholderIdx += cols
  }
  output += '  <tbody>\n'
  for (let rowIdx = 1; rowIdx <= rows; rowIdx++) {
    output += `    <tr>\n${repeatWithIndex('      <td>${IDX:Cell IDX Value}</td>\n', cols, placeholderIdx)}    </tr>\n`
    placeholderIdx += cols
  }
  return `${output}  </tbody>\n</table>`
}

/**
 *
 * @param {String} input Text to repeat
 * @param {Number} times Number of times to repeat
 * @param {Number} startIdx Starting index number
 * @returns {String} Output
 */
function repeatWithIndex(input, times, startIdx = 1) {
  let output = ''
  for (let idx = startIdx; idx < startIdx + times; idx++) {
    output += input.replaceAll('IDX', idx.toString())
  }
  return output
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function activateSnippetsView(context) {
  const snippetsProvider = new SnippetsProvider(context)
  const snippetsView = vscode.window.createTreeView('draftforge-snippets', {
    treeDataProvider: snippetsProvider
  })
  context.subscriptions.push(snippetsView)

  context.subscriptions.push(
    vscode.commands.registerCommand('draftforge.insertSnippet', async (snippet) => {
      try {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
          return vscode.window.showInformationMessage('No active editor to insert snippet into.')
        }
        const body = typeof snippet.body === 'function' ? await snippet.body() : snippet.body
        if (!body) {
          return
        }
        const snippetString = new vscode.SnippetString(body || '')
        await editor.insertSnippet(snippetString, editor.selection.start)
      } catch (err) {
        console.warn(err)
        vscode.window.showErrorMessage(err.message)
      }
    })
  )

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => snippetsProvider.refresh())
  )
}
