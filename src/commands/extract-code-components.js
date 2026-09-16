import * as vscode from 'vscode'
import { parse, posix } from 'node:path'

const EXTRACT_DIR = 'code-extracts'

// Matches a <sourcecode> element, capturing its raw attributes (which may span
// multiple lines) and its contents. Attribute values are consumed as quoted
// strings so that a `>` inside a value doesn't end the open tag early.
const XML_CODE_RGX =
  /<sourcecode(?<attr>(?:"[^"]*"|'[^']*'|[^>"'])*)>\r?\n?(?<code>[\s\S]*?)\r?\n?<\/sourcecode>/gi

// Matches a CDATA section enclosing the whole contents of a code component,
// along with the line break that usually follows the opening delimiter and
// precedes the closing one.
const XML_CDATA_RGX = /^[ \t]*<!\[CDATA\[(?:\r?\n)?(?<code>[\s\S]*?)(?:\r?\n)?[ \t]*\]\]>[ \t]*$/

// Matches a fenced code block (kramdown / CommonMark). The info string is the
// language, which kramdown-rfc turns into the sourcecode / artwork type; it may
// contain any character except whitespace (e.g. `asn.1`, `C#`, `cbor-diag`).
const MD_FENCE_RGX =
  /^[ \t]{0,3}(?<fence>~{3,}|`{3,})[ \t]*(?<info>[^\s`]*)[^\n]*\n(?<code>[\s\S]*?)(?:\r?\n)?^[ \t]{0,3}\k<fence>[~`]*[ \t]*\r?$/gm

// Matches a kramdown block IAL, e.g. {: #fig-1 sourcecode-name="example.yang"}
const MD_IAL_RGX = /^[ \t]{0,3}\{:(?<ial>[^}\n]*)\}[ \t]*$/

// Matches a kramdown-rfc file include directive, e.g. {::include example.yang}
const MD_INCLUDE_RGX = /^[ \t]*\{::include[ \t]+(?<path>[^}\n]+?)[ \t]*\}[ \t]*$/gm

// Languages that kramdown-rfc renders as a diagram / artwork rather than as
// source code. Unless such a block is explicitly named, it isn't a code
// component and is left alone.
const DIAGRAM_TYPES = new Set([
  'aasvg',
  'ascii-art',
  'ditaa',
  'goat',
  'math',
  'mermaid',
  'mscgen',
  'plantuml',
  'plantuml-utxt'
])

/**
 * @typedef {object} CodeComponent
 * @property {number} index Offset of the component in the document
 * @property {number} end Offset just past the component
 * @property {string|null} name Explicit filename, if the document provides one
 * @property {string|null} type Code type / language
 * @property {string} code Contents of the component
 */

/**
 * Extract the value of an attribute from a raw attribute string.
 *
 * @param {string|null} attrs Raw attribute string of an open tag or an IAL
 * @param {string} name Attribute name to look for
 * @returns {string|null} Trimmed attribute value, or null if absent / empty
 */
function getAttrValue(attrs, name) {
  if (!attrs) {
    return null
  }
  const rgx = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i')
  const match = attrs.match(rgx)
  const value = (match?.[1] ?? match?.[2])?.trim()
  return value || null
}

/**
 * Reduce a name attribute to a safe single-segment filename.
 *
 * @param {string} name Value of the name attribute
 * @returns {string|null} Safe filename, or null if nothing usable remains
 */
function sanitizeFileName(name) {
  const base = posix.basename(name.replace(/\\/g, '/')).trim()
  if (!base || base === '.' || base === '..') {
    return null
  }
  return base
}

/**
 * Strip the CDATA section enclosing the contents of a code component, if any.
 *
 * @param {string} code Contents of the code component
 * @returns {string} The code, without its enclosing CDATA delimiters
 */
function stripCdata(code) {
  return code.match(XML_CDATA_RGX)?.groups?.code ?? code
}

/**
 * Get the full line preceding the given offset, which must be at a line start.
 *
 * @param {string} contents Document contents
 * @param {number} index Offset of the start of a line
 * @returns {string} The preceding line, without its line ending
 */
function lineBefore(contents, index) {
  if (index <= 0) {
    return ''
  }
  const end = index - 1
  return contents.slice(contents.lastIndexOf('\n', end - 1) + 1, end).replace(/\r$/, '')
}

/**
 * Get the full line following the given offset, which must be at a line end.
 *
 * @param {string} contents Document contents
 * @param {number} end Offset of the end of a line
 * @returns {string} The following line, without its line ending
 */
function lineAfter(contents, end) {
  const start = contents.indexOf('\n', end)
  if (start < 0) {
    return ''
  }
  const next = contents.indexOf('\n', start + 1)
  return contents.slice(start + 1, next < 0 ? undefined : next).replace(/\r$/, '')
}

/**
 * Collect the <sourcecode> elements of an RFCXML document.
 *
 * @param {string} contents Document contents
 * @returns {CodeComponent[]}
 */
function collectXmlComponents(contents) {
  const components = []
  for (const match of contents.matchAll(XML_CODE_RGX)) {
    const attrs = match.groups?.attr
    components.push({
      index: match.index,
      end: match.index + match[0].length,
      name: getAttrValue(attrs, 'name'),
      type: getAttrValue(attrs, 'type'),
      code: stripCdata(match.groups?.code ?? '')
    })
  }
  return components
}

/**
 * Collect the fenced code blocks of a markdown (kramdown-rfc) document.
 *
 * A block is a code component when it has a language, or when it is named with
 * a sourcecode-name / artwork-name attribute in its block IAL - kramdown allows
 * that IAL on its own line either directly after or directly before the block.
 *
 * @param {string} contents Document contents
 * @returns {CodeComponent[]}
 */
function collectMarkdownComponents(contents) {
  const components = []
  for (const match of contents.matchAll(MD_FENCE_RGX)) {
    const end = match.index + match[0].length
    const ial =
      lineAfter(contents, end).match(MD_IAL_RGX)?.groups?.ial ??
      lineBefore(contents, match.index).match(MD_IAL_RGX)?.groups?.ial ??
      null

    const name = getAttrValue(ial, 'sourcecode-name') ?? getAttrValue(ial, 'artwork-name')
    const type =
      getAttrValue(ial, 'sourcecode-type') ??
      getAttrValue(ial, 'artwork-type') ??
      (match.groups?.info || null)

    // -> Skip blocks that aren't code components: untyped blocks and diagrams
    if (!name && (!type || DIAGRAM_TYPES.has(type.toLowerCase()))) {
      continue
    }

    components.push({ index: match.index, end, name, type, code: match.groups?.code ?? '' })
  }
  return components
}

/**
 * Resolve the kramdown-rfc {::include path} directives of a code block, so that
 * the extracted file holds the included code rather than the directive.
 *
 * @param {string} code Contents of the code component
 * @param {vscode.Uri} docUri Uri of the document holding the directive
 * @param {(text: string) => void} onWarning Called for each unresolvable include
 * @returns {Promise<string>} The code, with resolvable includes substituted
 */
async function resolveIncludes(code, docUri, onWarning) {
  let resolved = code
  for (const directive of code.matchAll(MD_INCLUDE_RGX)) {
    const includePath = directive.groups.path
    try {
      const included = await vscode.workspace.fs.readFile(
        vscode.Uri.joinPath(docUri, '..', includePath)
      )
      const text = new TextDecoder().decode(included).replace(/\r?\n$/, '')
      resolved = resolved.replace(directive[0], () => text)
    } catch {
      onWarning(`🔶 Could not resolve {::include ${includePath}}`)
    }
  }
  return resolved
}

/**
 * @param {vscode.ExtensionContext} context
 * @param outputView
 */
export function registerExtractCodeComponentsCommand(context, outputView) {
  context.subscriptions.push(
    vscode.commands.registerCommand('draftforge.extractCodeComponents', async function () {
      const activeDoc = vscode.window.activeTextEditor?.document

      if (!activeDoc) {
        return vscode.window.showErrorMessage('Open a document first.')
      } else if (activeDoc.uri.scheme === 'output') {
        return vscode.window.showErrorMessage(
          'Focus your desired document first. Focus is currently in the Output window.'
        )
      } else if (!['xml', 'markdown'].includes(activeDoc.languageId)) {
        return vscode.window.showErrorMessage('Unsupported Document Type.')
      }

      // -> Prompt the user for types to include
      const includeTypesPrompt = await vscode.window.showQuickPick(
        [
          { label: 'All code components of any type', picked: true, value: 'all' },
          { label: 'ABNF', value: 'abnf' },
          { label: 'MIB', value: 'mib' },
          { label: 'YANG', value: 'yang|yangtree' },
          { label: 'XML', value: 'xml' }
        ],
        {
          ignoreFocusOut: true,
          title: 'Which code components to extract?',
          placeHolder: 'Choose...'
        }
      )

      if (!includeTypesPrompt?.value) {
        vscode.window.showInformationMessage('Action cancelled by user.')
        return
      }
      const includeTypes = includeTypesPrompt.value.split('|')

      // -> Process document
      try {
        const workspaceUri = vscode.workspace.getWorkspaceFolder(activeDoc.uri).uri
        const isMarkdown = activeDoc.languageId === 'markdown'
        const contents = activeDoc.getText()

        const fileName = parse(activeDoc.fileName).base
        outputView.clear()
        outputView.setFileUri(activeDoc.uri)
        outputView.appendHeader(`Code components extracted from ${fileName}:`)

        // -> Collect components, in document order. Markdown drafts may hold raw
        //    RFCXML too, so both syntaxes are gathered and anything nested in an
        //    already collected component is then discarded.
        const components = [
          ...collectXmlComponents(contents),
          ...(isMarkdown ? collectMarkdownComponents(contents) : [])
        ].sort((a, b) => a.index - b.index)

        let extractedCount = 0
        let noNameIdx = 1
        let dirCreated = false
        let previousEnd = -1

        for (const component of components) {
          if (component.index < previousEnd) {
            continue
          }
          previousEnd = component.end

          // -> Build filename
          const codeType = component.type
          let codeFileName = component.name ? sanitizeFileName(component.name) : null

          if (!codeFileName) {
            codeFileName = `${parse(activeDoc.fileName).name}-${noNameIdx}`
            noNameIdx++
          }
          if (!posix.extname(codeFileName)) {
            codeFileName = `${codeFileName}.${codeType ?? 'txt'}`
          }

          // -> Ensure type is allowed
          if (!includeTypes.includes('all')) {
            let isAllowed = false
            for (const allowedType of includeTypes) {
              if (codeType && codeType.toLowerCase() === allowedType) {
                isAllowed = true
              } else if (codeFileName.toLowerCase().endsWith(`.${allowedType}`)) {
                isAllowed = true
              }
            }
            if (!isAllowed) {
              continue
            }
          }

          // -> Resolve kramdown-rfc includes
          const code = isMarkdown
            ? await resolveIncludes(component.code, activeDoc.uri, (text) =>
                outputView.appendLine(text)
              )
            : component.code

          // -> Ensure output directory exists
          if (!dirCreated) {
            await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(workspaceUri, EXTRACT_DIR))
            dirCreated = true
          }

          // -> Export code to disk
          await vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(workspaceUri, EXTRACT_DIR, codeFileName),
            new TextEncoder().encode(code)
          )

          outputView.appendLine(`- ./${EXTRACT_DIR}/${codeFileName}`)
          extractedCount++
        }

        if (extractedCount <= 0) {
          outputView.appendLine('No code components found.')
          vscode.window.showInformationMessage('No code components found.')
        } else {
          outputView.appendLine(`\n${extractedCount} code components extracted to ./${EXTRACT_DIR}`)
          vscode.window.showInformationMessage(
            `Found ${extractedCount} code component(s). See Output: DraftForge`
          )
        }

        outputView.reveal()
      } catch (err) {
        console.log(err)
        vscode.window.showErrorMessage(`Something went wrong: ${err.message}`)
      }
    })
  )
}
