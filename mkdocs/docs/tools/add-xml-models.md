# Add XML Models

## Description

This tool performs the following actions, in order:

- Fetch the latest version of [rfc7991bis.rnc](https://github.com/ietf-tools/RFCXML/raw/main/rfc7991bis.rnc) and [SVG-1.2-RFC.rnc](https://github.com/ietf-tools/RFCXML/raw/main/SVG-1.2-RFC.rnc) from GitHub and puts them into the current workspace directory.
- Replace the `<?xml-model>` tag (or add it if not already present) with `<?xml-model href="rfc7991bis.rnc"?>` in the active document.

## Supported Document Types

- [x] RFCXML
- [ ] Markdown
- [ ] Plain Text