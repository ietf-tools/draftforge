# Prepare for Publishing

## Description

This tool performs the following actions, in order:

- Prompt the user for the RFC number to use
- Scan the repository for files matching `rfcXXXX.{html,pdf,txt,xml}` or `rfcXXXX.notprepped.xml` (where `XXXX` is the RFC number)
- For XML files, validate that the `<rfc number="XXXX"` value matches the expected RFC number
- Add the RFC number and the matching files to `manifest.json` in the `publications` field

## Supported Document Types

- [x] RFCXML
- [ ] Markdown
- [ ] Plain Text
