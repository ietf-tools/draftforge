import * as vscode from 'vscode'
import { extract } from 'tar'
import { load, FAILSAFE_SCHEMA } from 'js-yaml'
import { sortBy } from 'es-toolkit/array'

class SnippetsProvider {
  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event
    this.extraSnippets = []

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
    this.snippets = sortBy(
      [
        // Prebuilt Snippets
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
          id: 'cat_xmlReferences',
          label: 'References',
          children: [
            {
              id: 'xmlGenericRefBlock',
              label: 'Generic',
              description: 'Insert a generic reference block',
              body: '<reference anchor="${1:Citation Tag}" target="${2:URL}">\n\t<front>\n\t\t<title>${3:Title}</title>\n\t\t<author initials="" surname="" fullname="">\n\t\t\t<organization />\n\t\t</author>\n\t\t<date month="${4:$CURRENT_MONTH_NAME}" year="${5:$CURRENT_YEAR}"/>\n\t</front>\n\t<seriesInfo name="${6:Name}" value="${7:Value}"/>\n\t<seriesInfo name="DOI" value="${8:Value}"/>\n</reference>',
              targetLanguage: 'xml'
            },
            {
              id: 'xmlRfcRefBlock',
              label: 'RFC',
              description: 'Insert an RFC reference block',
              body: '<reference anchor="RFC${1:YYYY}" target="https://www.rfc-editor.org/info/rfc${1:YYYY}">\n\t<front>\n\t\t<title>${2:Title}</title>\n\t\t<author initials="" surname="" fullname="">\n\t\t\t<organization />\n\t\t</author>\n\t\t<date month="${3:$CURRENT_MONTH_NAME}" year="${4:$CURRENT_YEAR}"/>\n\t</front>\n\t<seriesInfo name="RFC" value="${1:YYYY}"/>\n\t<seriesInfo name="DOI" value="10.17487/RFC${1:YYYY}"/>\n</reference>',
              targetLanguage: 'xml'
            }
          ]
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
        },
        // Extra snippets from disk / remote
        ...this.extraSnippets
      ].filter((s) => s.targetLanguage === currentLanguage || s.children),
      ['label']
    )
  }

  refresh() {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(snippet) {
    if (snippet.children) {
      const item = new vscode.TreeItem(snippet.label, vscode.TreeItemCollapsibleState.Expanded)
      item.description = false
      item.iconPath = new vscode.ThemeIcon('folder')
      item.contextValue = snippet.id
      return item
    } else {
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
  }

  getChildren(item) {
    return item ? item.children : this.snippets
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

  // Insert Snippet
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

  // Import Snippets
  context.subscriptions.push(
    vscode.commands.registerCommand('draftforge.importSnippets', async (silent = false) => {
      try {
        let imported = 0
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Window,
            title: 'DraftForge — Importing snippets...'
          },
          async (_progress) => {
            const extractDir = vscode.Uri.joinPath(context.globalStorageUri, 'snippets')

            if (!(await directoryExists(extractDir))) {
              if (silent) {
                return 0
              } else {
                throw new Error('Snippets directory not found.')
              }
            }

            const entries = await vscode.workspace.fs.readDirectory(extractDir)
            const extraSnippets = []
            for (const [name, type] of entries) {
              const entryUri = vscode.Uri.joinPath(extractDir, name)
              if (type === vscode.FileType.File && name.endsWith('.yaml')) {
                const yamlContent = await vscode.workspace.fs.readFile(entryUri)
                console.log(`Importing snippet ${name}...`)
                const snippetContent = load(yamlContent, {
                  filename: name,
                  schema: FAILSAFE_SCHEMA,
                  maxDepth: 2
                })
                if (snippetContent.category) {
                  let category = extraSnippets.find(
                    (s) => s.label === snippetContent.category && s.id.startsWith('cat_')
                  )
                  if (!category) {
                    category = {
                      id: `cat_${snippetContent.category.replaceAll(' ', '')}`,
                      label: snippetContent.category,
                      children: [snippetContent]
                    }
                    extraSnippets.push(category)
                  } else {
                    category.children.push(snippetContent)
                  }
                } else {
                  extraSnippets.push(snippetContent)
                }
                imported++
              }
            }
            snippetsProvider.extraSnippets = extraSnippets
            snippetsProvider.populateSnippets()
            snippetsProvider.refresh()
          }
        )
        return imported
      } catch (err) {
        console.warn(err)
        vscode.window.showErrorMessage(err.message)
      }
    })
  )

  // Fetch Remote Snippets
  context.subscriptions.push(
    vscode.commands.registerCommand('draftforge.fetchSnippets', async () => {
      try {
        const ghSession = await vscode.authentication.getSession(
          'github',
          ['repo'], // scopes; 'repo' grants private repo access
          { createIfNone: true }
        )
        const ghToken = ghSession.accessToken

        let imported = 0

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'DraftForge — Fetching remote snippets',
            cancellable: false
          },
          async (progress) => {
            progress.message = 'Creating local storage for snippets...'
            const dir = context.globalStorageUri
            await vscode.workspace.fs.createDirectory(dir)

            progress.message = 'Fetching remote snippets...'
            const res = await fetch(
              `https://api.github.com/repos/rfc-editor-drafts/common-snippets-rpc/tarball/main`,
              { headers: { Authorization: `Bearer ${ghToken}` } }
            )
            const buffer = Buffer.from(await res.arrayBuffer())

            progress.message = 'Writing snippets tarball to disk...'
            const fileUri = vscode.Uri.joinPath(dir, 'snippets.tar.gz')
            await vscode.workspace.fs.writeFile(fileUri, buffer)

            progress.message = 'Extracting snippets tarball...'
            const extractDir = vscode.Uri.joinPath(context.globalStorageUri, 'snippets')
            if (await directoryExists(extractDir)) {
              await vscode.workspace.fs.delete(extractDir, { recursive: true, useTrash: false })
            }
            await vscode.workspace.fs.createDirectory(extractDir)
            await extract({
              file: fileUri.fsPath,
              cwd: extractDir.fsPath,
              strip: 1,
              filter(flPath) {
                return flPath.endsWith('.yaml')
              }
            })
            await vscode.workspace.fs.delete(fileUri, { useTrash: false })

            progress.message = 'Importing snippets...'
            const result = await vscode.commands.executeCommand('draftforge.importSnippets', false)

            if (result && result > 0) {
              imported = result
            }
          }
        )

        vscode.window.showInformationMessage(`Fetched ${imported} snippets.`)
      } catch (err) {
        console.warn(err)
        vscode.window.showErrorMessage(err.message, { modal: true })
      }
    })
  )

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => snippetsProvider.refresh())
  )

  // Load snippets already on disk
  vscode.commands.executeCommand('draftforge.importSnippets', true)
}

async function directoryExists(uri) {
  try {
    const stat = await vscode.workspace.fs.stat(uri)
    return stat.type === vscode.FileType.Directory
  } catch {
    return false
  }
}
