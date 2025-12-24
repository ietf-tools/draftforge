import * as vscode from 'vscode'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'

const execAsync = promisify(exec)

/**
 * Run SVGCheck on text input
 * @param {String} inputContent
 * @returns {Promise<String>}
 */
async function run (inputContent) {
  try {
    // Get temp dir
    const tmpPath = await fs.mkdtemp(path.join(tmpdir(), 'draftforge-'))
    const now = Date.now().toString()

    // Write input
    const inputPath = path.join(tmpPath, `${now}.xml`)
    await fs.writeFile(inputPath, inputContent, 'utf8')

    // Run svgcheck
    const execPath = vscode.workspace.getConfiguration('draftforge.svgcheck').get('executablePath')
    const flags = vscode.workspace.getConfiguration('draftforge.svgcheck').get('flags')
    const cmd = `${execPath} ${flags} "${inputPath}"`
    const { stderr } = await execAsync(cmd, {
      timeout: 30000, // 30s
      windowsHide: true
    })
    await fs.rm(tmpPath, { recursive: true, force: true })
    return stderr
  } catch (err) {
    return err.message
  }
}

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 */
export function registerSvgcheckCommand (context, diagnosticCollection) {
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.svgcheck', async function () {
    const activeDoc = vscode.window.activeTextEditor?.document

    if (!activeDoc) {
      return vscode.window.showErrorMessage('Open a document first.')
    } else if (activeDoc.uri.scheme === 'output') {
      return vscode.window.showErrorMessage('Focus your desired document first. Focus is currently in the Output window.')
    } else if (activeDoc.languageId !== 'xml') {
      return vscode.window.showErrorMessage('Unsupported Document Type.')
    }

    diagnosticCollection.clear()

    try {
      const output = await run(activeDoc.getText())
      if (output.includes('ERROR: ')) {
        const diags = []
        const diagRgx = /[0-9]+\.xml:(?<line>[0-9]+): (?<msg>.*)/i
        for(const line of output.split('\n')) {
          const match = line.match(diagRgx)
          if (match) {
            const lineIdx = parseInt(match.groups.line) - 1
            diags.push(new vscode.Diagnostic(
              new vscode.Range(lineIdx, 0, lineIdx, line.length),
              match.groups.msg,
              vscode.DiagnosticSeverity.Warning
            ))
          }
        }
        diagnosticCollection.set(activeDoc.uri, diags)
        await vscode.commands.executeCommand('workbench.action.problems.focus')
      } else {
        vscode.window.showInformationMessage('Document conforms to SVG requirements.')
      }
    } catch (err) {
      vscode.window.showErrorMessage(err.message)
    }
  }))
}
