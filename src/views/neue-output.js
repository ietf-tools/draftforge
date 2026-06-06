// @ts-check
import * as vscode from 'vscode'

// ─── Types (JSDoc only) ───────────────────────────────────────────────────────

/**
 * @typedef {Object} LineRange
 * @property {number} startLine       - 0-based start line
 * @property {number} startCharacter  - 0-based start character
 * @property {number} endLine         - 0-based end line
 * @property {number} endCharacter    - 0-based end character
 * @property {string} [label]         - Optional label override. Defaults to ":line" or ":line:col"
 */

/**
 * @typedef {Object} OutputLine
 * @property {string}      text     - The text content of the line
 * @property {LineRange[]} [ranges] - Optional ranges shown as clickable links at the end of the line
 * @property {string|null}      [color]  - Optional CSS color, e.g. "var(--vscode-errorForeground)"
 * @property {string|null}      [badge]  - Optional badge content
 * @property {string|null}      [kind]  - Optional special element kind (separator, header, etc.)
 */

// ─── View ─────────────────────────────────────────────────────────────────────

/**
 * Implements vscode.WebviewViewProvider so it can be registered with
 * vscode.window.registerWebviewViewProvider() and contributed to the bottom
 * panel via the "panel" location in package.json.
 *
 * The view id passed to registerWebviewViewProvider() must match the id
 * declared in package.json under contributes.views.panel[].id.
 *
 * @implements {vscode.WebviewViewProvider}
 */
export class OutputWebviewView {
  /** @type {vscode.WebviewView | null} */
  #view = null

  /** @type {vscode.Uri} */
  #fileUri

  /** @type {OutputLine[]} */
  #lines = []

  /** @type {vscode.Disposable[]} */
  #disposables = []

  constructor() {
    this.#fileUri = vscode.Uri.file('/')
  }

  // ─── WebviewViewProvider ────────────────────────────────────────────────────

  /**
   * Called by VS Code when the view is first shown. Wires up the webview and
   * replays any lines that were appended before the view was ready.
   *
   * @param {vscode.WebviewView} webviewView
   */
  resolveWebviewView(webviewView) {
    this.#view = webviewView

    webviewView.webview.options = {
      enableScripts: true
    }

    webviewView.webview.onDidReceiveMessage(
      (msg) => this.#handleMessage(msg),
      null,
      this.#disposables
    )

    webviewView.onDidDispose(
      () => {
        this.#view = null
        this.#disposables.forEach((d) => d.dispose())
        this.#disposables = []
      },
      null,
      this.#disposables
    )

    // Render all lines accumulated before the view was visible
    this.#render()
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Change the document that range-links navigate into.
   * @param {vscode.Uri} fileUri
   */
  setFileUri(fileUri) {
    this.#fileUri = fileUri
  }

  /**
   * Append a plain text line (no links).
   * @param {string} text
   * @param {object} [opts] - Additional properties
   */
  appendLine(text, opts = {}) {
    const line = { text, ...opts }
    this.#lines.push(line)
    this.#pushLine(line)
  }

  /**
   * Append a line with optional range links.
   * @param {OutputLine} line
   */
  appendLineWithRanges(line) {
    this.#lines.push(line)
    this.#pushLine(line)
  }

  /**
   * Append multiple lines at once (triggers a full re-render).
   * @param {OutputLine[]} lines
   */
  appendLines(lines) {
    this.#lines.push(...lines)
    this.#render()
  }

  /**
   * Append header
   * @param {string} text
   */
  appendHeader(text) {
    this.#lines.push({ kind: 'header', text })
    this.#pushLine({ kind: 'header', text })
  }

  /**
   * Append a separator line
   */
  appendSeparator() {
    this.#lines.push({ kind: 'separator', text: '' })
    this.#pushLine({ kind: 'separator', text: '' })
  }

  /** Clear all lines. */
  clear() {
    this.#lines = []
    this.#view?.webview.postMessage({ type: 'clear' })
  }

  /** Reveal the view in the bottom panel. */
  reveal() {
    vscode.commands.executeCommand(`draftforge.outputView.focus`)
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  /**
   * Send a single new line to the webview without a full re-render.
   * No-ops silently if the view hasn't been resolved yet — the line is still
   * stored in #lines and will appear when #render() is called on resolve.
   * @param {OutputLine} line
   */
  #pushLine(line) {
    this.#view?.webview.postMessage({
      type: 'appendLine',
      line: this.#serializeLine(line)
    })
  }

  /**
   * @param {LineRange} r
   * @returns {string}
   */
  #defaultLabel(r) {
    const line = r.startLine + 1 // display as 1-based
    return r.startCharacter > 0 ? `:${line}:${r.startCharacter}` : `:${line}`
  }

  /**
   * @param {OutputLine} line
   * @returns {object}
   */
  #serializeLine({ text, color = null, badge = null, ranges = [], kind = 'text' }) {
    return {
      text,
      color,
      badge,
      ranges: ranges.map((r) => ({
        label: r.label ?? this.#defaultLabel(r),
        startLine: r.startLine,
        startCharacter: r.startCharacter,
        endLine: r.endLine,
        endCharacter: r.endCharacter
      })),
      kind
    }
  }

  /** @param {{ type: string, range: LineRange }} msg */
  #handleMessage(msg) {
    if (msg.type !== 'navigate') return
    const { startLine, startCharacter, endLine, endCharacter } = msg.range
    const range = new vscode.Range(startLine, startCharacter, endLine, endCharacter)
    vscode.window.showTextDocument(this.#fileUri, {
      selection: range,
      preserveFocus: false
    })
  }

  #render() {
    if (!this.#view) return
    this.#view.webview.html = this.#buildHtml()
  }

  /** @returns {string} */
  #buildHtml() {
    const serializedLines = this.#lines
      .map((l) => JSON.stringify(this.#serializeLine(l)))
      .join(',\n')

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--vscode-panel-background, #1e1e1e);
    color: var(--vscode-panel-foreground, #cccccc);
    font-family: var(--vscode-editor-font-family, 'Menlo', 'Consolas', monospace);
    font-size: var(--vscode-editor-font-size, 13px);
    line-height: 1.6;
    padding: 6px 0;
    overflow-x: auto;
  }

  #output {
    white-space: pre;
    min-width: max-content;
  }

  .line {
    align-items: baseline;
    gap: 4px;
    padding: 0 12px;
    min-height: 1.6em;
  }

  .line:hover {
    background: var(--vscode-list-hoverBackground, rgba(255,255,255,0.04));
  }

  .ranges {
    display: inline;
    gap: 6px;
    flex-shrink: 0;
    margin-left: 10px;
    color: rgba(255,255,255,0.6);
  }

  .range-link {
    color: var(--vscode-textLink-foreground, #4e94ce);
    cursor: pointer;
    text-decoration: none;
    font-size: 0.9em;
    user-select: none;
  }

  .range-link:hover {
    text-decoration: underline;
  }

  .header {
    font-weight: 600;
    padding: 6px 12px 6px 12px;
    margin-bottom: 8px;
    border-left: 4px solid rgb(0, 122, 204);
    background: linear-gradient(45deg, rgba(0, 122, 204, .1), rgba(0, 122, 204, 0));
  }

  .badge {
    display: inline;
    background-color: var(--vscode-activityBarBadge-background, rgb(0, 122, 204));
    color: var(--vscode-activityBarBadge-foreground, #FFF);
    font-weight: 700;
    padding: 1px 5px;
    font-size: 0.8em;
    margin-left: 10px;
    border-radius: 3px;
  }

  .separator {
    height: 1px;
    background: linear-gradient(to right, rgba(51,51,51,1), rgba(51,51,51,0));
    margin: 15px 0;
  }

  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-background, rgba(121,121,121,0.4));
    border-radius: 5px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--vscode-scrollbarSlider-hoverBackground, rgba(100,100,100,0.7));
  }
</style>
</head>
<body>
<div id="output"></div>
<script>
  const vscode = acquireVsCodeApi()
  const outputEl = document.getElementById('output')

  const buildLineEl = ({ text, color, badge, ranges, kind }) => {
    const row = document.createElement('div')

    switch (kind) {
      // ====== HEADER ======
      case 'header': {
        row.className = 'header'
        row.appendChild(document.createTextNode(text))
        break
      }
      // ====== SEPARATOR ======
      case 'separator': {
        row.className = 'separator'
        break
      }
      // ====== TEXT LINE ======
      default: {
        row.className = 'line'

        const textEl = Object.assign(document.createElement('span'), { className: 'line-text', textContent: text })
        if (color) {
          textEl.style.color = color
        }
        row.appendChild(textEl)

        if (badge) {
          const badgeEl = document.createElement('span')
          badgeEl.className = 'badge'
          badgeEl.appendChild(document.createTextNode(badge))
          row.appendChild(badgeEl)
        }

        if (ranges?.length > 0) {
          const rangesEl = document.createElement('span')
          rangesEl.className = 'ranges'
          rangesEl.appendChild(document.createTextNode('(Line '))

          let curIdx = 0
          for (const r of ranges) {
            curIdx++
            if (curIdx > 1) {
              rangesEl.appendChild(document.createTextNode(', '))
            }
            const a = Object.assign(document.createElement('a'), {
              className: 'range-link',
              textContent: r.label,
              title: \`Go to line \${r.startLine + 1}, col \${r.startCharacter}\`,
            })
            a.addEventListener('click', () => vscode.postMessage({ type: 'navigate', range: r }))
            rangesEl.appendChild(a)
          }

          rangesEl.appendChild(document.createTextNode(')'))

          row.appendChild(rangesEl)
        }
      }
    }

    return row
  }

  const initialLines = [${serializedLines}]
  outputEl.append(...initialLines.map(buildLineEl))

  window.addEventListener('message', ({ data: msg }) => {
    if (msg.type === 'appendLine') {
      outputEl.appendChild(buildLineEl(msg.line))
      window.scrollTo(0, document.body.scrollHeight)
    } else if (msg.type === 'clear') {
      outputEl.innerHTML = ''
    }
  })
</script>
</body>
</html>`
  }
}
