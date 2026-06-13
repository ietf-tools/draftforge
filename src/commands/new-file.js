import * as vscode from 'vscode'

const TEMPLATE_URLS = {
  markdown:
    'https://raw.githubusercontent.com/martinthomson/internet-draft-template/refs/heads/main/draft-todo-yourname-protocol.md',
  xmlStandard:
    'https://raw.githubusercontent.com/ietf-tools/RFCXML/refs/heads/main/templates/draft-rfcxml-general-template-standard-00.xml',
  xmlAnnotated:
    'https://raw.githubusercontent.com/ietf-tools/RFCXML/refs/heads/main/templates/draft-rfcxml-general-template-annotated-00.xml',
  xmlBare:
    'https://raw.githubusercontent.com/ietf-tools/RFCXML/refs/heads/main/templates/draft-rfcxml-general-template-bare-00.xml'
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function registerNewFileCommand(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('draftforge.newFileMarkdown', () =>
      createFileFromTemplate(TEMPLATE_URLS.markdown, 'markdown')
    ),
    vscode.commands.registerCommand('draftforge.newFileXml', async () => {
      const selectedTmpl = await vscode.window.showQuickPick(
        [
          { label: 'Use Standard Template', picked: true, value: 'xmlStandard' },
          { label: 'Use Annotated Template', value: 'xmlAnnotated' },
          { label: 'Use Bare Template', value: 'xmlBare' }
        ],
        {
          ignoreFocusOut: true,
          title: 'Select Template'
        }
      )
      if (selectedTmpl?.value) {
        void createFileFromTemplate(TEMPLATE_URLS[selectedTmpl.value], 'xml')
      }
    })
  )
}

/**
 * Fetches a template from GitHub and opens it as a new untitled document.
 *
 * @param url      Raw GitHub URL of the template file
 * @param language VS Code language id ('markdown', 'xml', ...) used for
 *                 syntax highlighting and the default save extension
 */
async function createFileFromTemplate(url, language) {
  try {
    const content = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'DraftForge: fetching template…',
        cancellable: false
      },
      () => fetchTemplate(url)
    )

    // Open an untitled (unsaved) document pre-filled with the template.
    const doc = await vscode.workspace.openTextDocument({ language, content })
    await vscode.window.showTextDocument(doc, { preview: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    void vscode.window.showErrorMessage(
      `DraftForge: could not create file from template — ${message}`
    )
  }
}

async function fetchTemplate(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`)
    }
    return await response.text()
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out after 10 seconds')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
