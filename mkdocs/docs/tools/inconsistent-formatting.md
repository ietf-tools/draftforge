# List Inconsistent Formatting

## Description

This tool lists instances of inconsistent formatting across a document.

### RFCXML

For RFCXML documents, the following formatting elements are considered:

- `<tt>`
- `<em>`
- `<strong>`
- `<spanx>`

!!! example
    Using both `protocol` and `<strong>protocol</strong>` will be flagged as inconsistent.

### Markdown

For Markdown documents, the following formatting syntaxes are considered:

- `**bold**`
- `*italic*`
- `` `inline code` ``

!!! example
    Using both `network` and `**network**` will be flagged as inconsistent.

## Supported Document Types

- [x] RFCXML
- [x] Markdown
- [ ] Plain Text