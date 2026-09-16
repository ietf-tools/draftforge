/**
 * A diagnostic line from the xml2rfc output, e.g.
 * `/tmp/draftforge-xyz/draft.xml(1264): Warning: Too long line found (L1317), ...`
 * The source prefix is missing on diagnostics not tied to an element, and
 * replaced by `(No source line available)` when the element has no line number.
 */
const diagRgx =
  /^(?:.*\.xml\((?<line>[0-9]+)\): |\(No source line available\): )?(?<kind>Warning|Error): (?<msg>.*)$/i

/**
 * Lines xml2rfc writes to stderr that are not diagnostics and must never be
 * mistaken for the continuation of one.
 */
const trailerRgx = /^\s*(?:Created file\b|Unable to complete processing\b)/

/**
 * Parse the stderr output of xml2rfc into diagnostics.
 *
 * Some messages span several lines: the first line ends with a colon and the
 * lines that follow hold the offending content (e.g. the too long line itself).
 * These are collected as details of the diagnostic they belong to.
 *
 * @param {String} stderr xml2rfc stderr output
 * @returns {Array<{kind: String, msg: String, line: Number|null, details: String[]}>}
 */
export function parseXml2rfcOutput(stderr) {
  const diagnostics = []
  // Diagnostic currently accepting continuation lines, if any
  let pending = null

  for (const outLine of (stderr ?? '').split(/\r?\n/)) {
    const match = outLine.match(diagRgx)
    if (match) {
      const msg = match.groups.msg.trimEnd()
      const diag = {
        kind: match.groups.kind,
        msg,
        line: match.groups.line ? parseInt(match.groups.line) : null,
        details: []
      }
      diagnostics.push(diag)
      // Only a message ending with a colon announces content on the next lines
      pending = msg.endsWith(':') ? diag : null
      continue
    }

    if (!pending || !outLine.trim() || trailerRgx.test(outLine)) {
      pending = null
      continue
    }

    // The first continuation line may sit at column 0, further ones are indented
    if (pending.details.length > 0 && !/^\s/.test(outLine)) {
      pending = null
      continue
    }

    pending.details.push(outLine.trimEnd())
  }

  return diagnostics
}

/**
 * Write the diagnostics from an xml2rfc run to the output view, adding the
 * header before the first one.
 *
 * @param outputView
 * @param {String} stderr xml2rfc stderr output
 * @param {String} header Header to display above the diagnostics
 * @returns {Number} Number of diagnostics written
 */
export function appendXml2rfcOutput(outputView, stderr, header) {
  const diagnostics = parseXml2rfcOutput(stderr)

  for (const [idx, diag] of diagnostics.entries()) {
    if (idx === 0) {
      outputView.appendHeader(header)
    }
    const text = `- ${diag.kind}: ${diag.msg}`
    if (diag.line) {
      const lineInt = Math.abs(diag.line - 1)
      outputView.appendLineWithRanges({
        text,
        ranges: [
          {
            startLine: lineInt,
            startCharacter: 0,
            endLine: lineInt,
            endCharacter: 0,
            label: `${diag.line}`
          }
        ]
      })
    } else {
      outputView.appendLine(text)
    }
    for (const detail of diag.details) {
      outputView.appendLine(`  ${detail}`)
    }
  }

  return diagnostics.length
}
