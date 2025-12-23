import * as vscode from 'vscode'

/**
 * xi:include CodeLens Provider
 * @class
 * @implements {vscode.CodeLensProvider}
 */
export class XiIncludeCodeLensProvider {
  /**
   * Provide CodeLenses
   * @param {vscode.TextDocument} document
   */
  provideCodeLenses(document) {
    const text = document.getText()
    const lenses = []
    const includeRegex = /<xi:include\s+[^>]*href\s*=\s*"(?<url>[^"]+)"[^>]*\/?>/g
    const referenceRegex = /<reference\s+[^>]*target\s*=\s*"(?<url>[^"]+)"[^>]*\/?>[\s\S]+?<\/reference>/g

    let match
    while ((match = includeRegex.exec(text)) !== null) {
      const startPos = document.positionAt(match.index)
      const line = document.lineAt(startPos.line)

      lenses.push(new vscode.CodeLens(line.range, {
        title: 'Peek Reference',
        command: 'draftforge.peekXiInclude',
        arguments: [match.groups.url, document.uri.toString(), startPos.line, startPos.character]
      }))
      lenses.push(new vscode.CodeLens(line.range, {
        title: 'Expand Reference',
        command: 'draftforge.expandXiInclude',
        arguments: [match.groups.url, document.uri, new vscode.Range(startPos.line, startPos.character, startPos.line, startPos.character + match[0].length)]
      }))
    }
    while ((match = referenceRegex.exec(text)) !== null) {
      const startPos = document.positionAt(match.index)
      const endPos = document.positionAt(match.index + match[0].length)
      const line = document.lineAt(startPos.line)

      lenses.push(new vscode.CodeLens(line.range, {
        title: 'Fold Reference into <xi:include />',
        command: 'draftforge.foldReference',
        arguments: [match.groups.url, document.uri, new vscode.Range(startPos, endPos)]
      }))
    }

    return lenses
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
export function registerExpandIncludesCommands (context) {
  /** @type {Map<string,string>} */
  const includeContentMap = new Map()
  const includeContentChanged = new vscode.EventEmitter()
  const includeProvider = {
    onDidChange: includeContentChanged.event,
    /** @param {vscode.Uri} uri */
    provideTextDocumentContent(uri) {
      return includeContentMap.get(uri.toString()) || ''
    }
  }
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('draftforge-include', includeProvider)
  )

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ language: 'xml', scheme: 'file' }, new XiIncludeCodeLensProvider())
  )

  /**
   * Peek into xi:include reference
   */
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.peekXiInclude', async (url, sourceUriString, line = 0, character = 0) => {
    try {
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const body = await res.text()

      const virtualUri = vscode.Uri.parse(`draftforge-include:${encodeURIComponent(url)}`)
      includeContentMap.set(virtualUri.toString(), body)
      includeContentChanged.fire(virtualUri)

      const sourceUri = vscode.Uri.parse(sourceUriString)
      const position = new vscode.Position(Number(line), Number(character))
      const location = new vscode.Location(virtualUri, new vscode.Position(0, 0))

      // Open an inline peek showing the fetched content
      await vscode.commands.executeCommand('editor.action.peekLocations', sourceUri, position, [location], 'peek')
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to fetch xi:include contents: ${String(err)}`)
    }
  }))

  /**
   * Expand xi:include reference
   */
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.expandXiInclude', async (url, documentUri, range) => {
    try {
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const body = await res.text()

      const editor = vscode.window.visibleTextEditors.find(ed => ed.document.uri === documentUri)
      if (!editor) {
        throw new Error('Reference editor not found.')
      }

      await editor.edit(editBuilder => {
        // Ensure content is indented like the line it replaces

        // -> Compute the line indentation where the range starts
        const line = editor.document.lineAt(range.start.line)
        const lineIndent = (line.text.match(/^\s*/) || [''])[0]

        // -> Normalize fetched body: split lines and remove common leading indent
        const rawLines = body.split(/\r?\n/)
        const nonEmptyLines = rawLines.filter(l => l.trim() !== '')
        const commonIndent = nonEmptyLines.length
          ? Math.min(...nonEmptyLines.map(l => (l.match(/^\s*/) || [''])[0].length))
          : 0
        const normalizedLines = rawLines.map(l => l.slice(commonIndent))

        // -> Re-indent: if the replacement starts mid-line, don't add line indent to the first line
        const replaced = normalizedLines.map((l, i) => {
          if (l === '') return ''
          if (i === 0) return l
          return lineIndent + l
        }).join('\n').trimEnd()

        editBuilder.replace(range, replaced)
      })
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to expand xi:include: ${String(err)}`)
    }
  }))

  /**
   * Fold reference into xi:include
   */
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.foldReference', async (url, documentUri, range) => {
    try {
      const editor = vscode.window.visibleTextEditors.find(ed => ed.document.uri === documentUri)
      if (!editor) {
        throw new Error('Reference editor not found.')
      }

      let bibUrl = ''

      // -> RFC reference
      const matchRfcRgx = /rfc(?<rfcNumber>[0-9]+)/gi
      for (const match of url.matchAll(matchRfcRgx)) {
        // Keep the last instance only
        bibUrl = `https://bib.ietf.org/public/rfc/bibxml/reference.RFC.${match.groups.rfcNumber}.xml`
      }

      // -> Draft reference
      if (!bibUrl && url.startsWith('https://datatracker.ietf.org/doc/html/')) {
        const match = /https:\/\/datatracker.ietf.org\/doc\/html\/(?<name>[a-z0-9-]+)(.xml)?/i.exec(url)
        bibUrl = `https://bib.ietf.org/public/rfc/bibxml3/reference.I-D.${match.groups.name}.xml`
      }

      // -> Unsupported reference
      if (!bibUrl) {
        vscode.window.showErrorMessage(`Unsupported reference target for automatic folding.`)
        return
      }

      await editor.edit(editBuilder => {
        editBuilder.replace(range, `<xi:include href="${bibUrl}" />`)
      })
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to fold reference into xi:include: ${String(err)}`)
    }
  }))
}
