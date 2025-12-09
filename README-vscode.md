![DraftForge](media/logo-text.png)

# IETF DraftForge

> Warning ⚠️ - This is alpha release that should only be used for testing and development purposes by IETF / RFC-Editor staff.

IETF DraftForge provide tools, validation checks and snippets for both Internet-Drafts authors and the RFC Production Center.

## Features

* Validation Checks
  * Articles Check
  * Hyphenation Check
  * Inclusive Language Check
  * Non*ASCII Check
  * Placeholders Check
  * Repeated Words Check
  * Typos Check
* Tools
  * Add XML Models
  * Export as HTML
  * Export as PDF
  * Export as TXT
  * Extract `[rfced]` comments
  * Format Document
  * IDNits
  * Open Preview
  * Strip `^M` Line Endings
* Snippets
  * Author Block
  * Date Element
* Reference
  * RFCXML
    * Vocabulary

## Extension Settings

This extension contributes the following settings:

* `draftforge.experience`: Set to `author` *(default)* for an author-centric experience or `rpc` for a RPC staff-centric experience.
* `draftforge.idnits.mode`: The default validation mode to use when running IDNits. Set to `prompt` *(default)* to be prompted every time or to `normal`, `forgive`, `submission`.
* `draftforge.idnits.offline`: Whether to run IDNits in offline mode. Any check that requires an internet connection will be skipped. (Defaults to `false`)
* `draftforge.xml2rfc.executablePath`: XML2RFC executable name or path. (Defaults to `xml2rfc`)
* `draftforge.xml2rfc.previewFlags`: The flags to provide to xml2rfc for the live preview of XMLRFC documents. Do not include the output format / paths flags. (Defaults to `--v3 --no-dtd --no-network --id-is-work-in-progress`)
* `draftforge.xml2rfc.htmlOutputFlags`: The flags to provide to xml2rfc when generating HTML outputs of XMLRFC documents. Do not include the output format / paths flags. (Defaults to `--v3 --id-reference-base-url=\"https://datatracker.ietf.org/doc/html/\" --rfc-reference-base-url=\"https://www.rfc-editor.org/rfc/\" --metadata-js-url=\"https://www.rfc-editor.org/js/metadata.min.js\" --id-is-work-in-progress`)
* `draftforge.xml2rfc.txtOutputFlags`: The flags to provide to xml2rfc when generating TXT outputs of XMLRFC documents. Do not include the output format / paths flags. (Defaults to `--v3 --bom --id-reference-base-url=\"https://datatracker.ietf.org/doc/html/\" --id-is-work-in-progress`)
* `draftforge.xml2rfc.pdfOutputFlags`: The flags to provide to xml2rfc when generating PDF outputs of XMLRFC documents. Do not include the output format / paths flags. (Defaults to `--v3 --id-reference-base-url=\"https://datatracker.ietf.org/doc/html/\" --rfc-reference-base-url=\"https://www.rfc-editor.org/rfc/\" --id-is-work-in-progress`)

## Release Notes

See [Releases](https://github.com/ietf-tools/draftforge-ext/releases) on GitHub for the full release notes.
