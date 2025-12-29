# Articles

## Description

This validation check looks for bad indefinite article usage.

The following scenarios are detected:

- Use of `a` instead of `an` in front of words starting with a vowel. (Some [exceptions](https://github.com/ietf-tools/draftforge/blob/main/src/commands/articles.js#L27-L28) are taken into account.)
- Use of `an` instead of `a` in front of words starting with a consonant. (Some [exceptions](https://github.com/ietf-tools/draftforge/blob/main/src/commands/articles.js#L29-L30) are taken into account.)
- Use of `an LF` instead of `a LF`.

## Supported Document Types

- [x] RFCXML
- [x] Markdown
- [x] Plain Text