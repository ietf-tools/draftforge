import * as vscode from 'vscode'

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.DiagnosticCollection} diagnosticCollection
 */
export function registerCheckArticlesCommand (context, diagnosticCollection) {
  const ignores = [] // TODO: implement ignoes
  
  context.subscriptions.push(vscode.commands.registerCommand('draftforge.checkArticles', async function (clearFirst = true) {
    if (clearFirst) {
      diagnosticCollection.clear()
    }

    try {
      const activeDoc = vscode.window.activeTextEditor.document

      const partARgx = /(?<!(?:[aA]ppendix|[cC]onnection|[lL]ink|[nN]ode|Operator)) (?!(?:[aA] (?:AAA|Europe|[oO]ne|U[A-Z]|U-label|[uU]biquitous|[uU]nicast|[uU]nicode|[uU]nidir|[uU]nif|[uU]nion|[uU]nique|[uU]nit|[uU]nivers|[uU]sable|[uU]sability|[uU]sage|[uU]se|[uU]tility)|a uCDN|A and))[aA] [aeiouAEIOU]/g
      const partARRgx = /(?!(?:[aA] (?:RADIUS|RECEIVE|RECOMMENDED|REFER|RELOAD|RST|REALM|RESERVATION|REQUEST|RESET|ROUTE|RPL)))[aA] R[A-Z]/g
      const partBRgx = / (?!(?:[aA]n (?:hour|honest|honor|Mtrace|x-coordinate|x coordinate|A[A-Z]|E[A-Z]|F[A-Z]|H[A-Z]|I[A-Z]|L[A-Z]|L[0-9][A-Z]|M[A-Z]|N[A-Z]|O[A-Z]|R[A-Z]|R[0-9]|S[A-Z]|X[A-Z]|X\.509|xTR)))[aA]n [b-df-hj-np-tv-zB-DF-HJ-NP-TV-Z]/g
      const partCRgx = /[aA]n (?:AAA|FEC|FIR|LIS|LRDD|MEG|MEP|MRHOF|MIC|NAPTR|NAT|NAS|RAS|ROHC|RPL|RST|SAFI|SCSI|SID|SIP|SMPTE|SYN|rinit)/g
      const partCLFRgx = /[aA]n LF /g

      const diags = []
      for (let lineIdx = 0; lineIdx < activeDoc.lineCount; lineIdx++) {
        const line = activeDoc.lineAt(lineIdx)
        for (const match of line.text.matchAll(partARgx)) {
          if (ignores.includes(match[0])) {
            continue
          }
          diags.push(new vscode.Diagnostic(
            new vscode.Range(lineIdx, match.index + 1, lineIdx, match.index + match[0].length),
            'Bad indefinite article usage detected. Consider using "an" instead of "a".',
            vscode.DiagnosticSeverity.Warning
          ))
        }
        for (const match of line.text.matchAll(partARRgx)) {
          if (ignores.includes(match[0])) {
            continue
          }
          diags.push(new vscode.Diagnostic(
            new vscode.Range(lineIdx, match.index + 1, lineIdx, match.index + match[0].length),
            'Bad indefinite article usage detected. Consider using "an" instead of "a".',
            vscode.DiagnosticSeverity.Warning
          ))
        }
        for (const match of line.text.matchAll(partBRgx)) {
          if (ignores.includes(match[0])) {
            continue
          }
          diags.push(new vscode.Diagnostic(
            new vscode.Range(lineIdx, match.index + 1, lineIdx, match.index + match[0].length),
            'Bad indefinite article usage detected. Consider using "a" instead of "an".',
            vscode.DiagnosticSeverity.Warning
          ))
        }
        for (const match of line.text.matchAll(partCRgx)) {
          if (ignores.includes(match[0])) {
            continue
          }
          diags.push(new vscode.Diagnostic(
            new vscode.Range(lineIdx, match.index + 1, lineIdx, match.index + match[0].length),
            'Bad indefinite article usage detected. Consider using "a" instead of "an".',
            vscode.DiagnosticSeverity.Warning
          ))
        }
        for (const match of line.text.matchAll(partCLFRgx)) {
          if (ignores.includes(match[0])) {
            continue
          }
          diags.push(new vscode.Diagnostic(
            new vscode.Range(lineIdx, match.index, lineIdx, match.index + match[0].length - 1),
            'Bad indefinite article usage detected. Consider using "a LF" instead of "an LF".',
            vscode.DiagnosticSeverity.Warning
          ))
        }
      }

      if (diags?.length > 0) {
        if (diagnosticCollection.has(activeDoc.uri)) {
          diagnosticCollection.set(activeDoc.uri, [...diagnosticCollection.get(activeDoc.uri), ...diags])
        } else {
          diagnosticCollection.set(activeDoc.uri, diags)
        }
        await vscode.commands.executeCommand('workbench.action.problems.focus')
      } else {
        vscode.window.showInformationMessage('No incorrect article usaged detected in this document.')
      }
    } catch (err) {
      console.warn(err)
      vscode.window.showErrorMessage(err.message)
    }
  }))
}