# List Abbreviations

## Description

This tool lists all abbreviations and their expansion in the document.

The following scenarios are listed:

- Abbreviation is expanded as XYZ
- Abbreviation is not expanded *(warning if not well known)*
- Abbreviation is well known
- Abbreviation is used before its expansion *(warning)*
- Abbreviation is used only once *(warning)*
- Expansion is used multiple times but never abbreviated *(warning)*
- Expansion is used X more times after first expansion *(warning)*
- Multiple different expansions for the same abbreviation are used *(warning)*
- Last term of the expansion is used after the abbreviation (e.g. `SIP protocol`) *(warning)*

!!! note
    This tool requires internet access to fetch the latest list. It is cached on subsequent runs.

[View current list](https://github.com/rfc-editor-drafts/common/blob/main/abbreviations.json)
{ .md-button }

## Supported Document Types

- [x] RFCXML
- [x] Markdown
- [x] Plain Text
