# List Inconsistent Capitalization

## Description

This tool lists instances of inconsistent capitalization for sequences of 2 to 5 terms.

!!! example
    Using both `autonomous system` and `Autonomous System` will  be flagged as inconsistent.

!!! note
    - Capitalization at the start of a sentence is and will not result in a match.
    - Words shorter than 3 characters (e.g. `at`, `the`, etc.) are ignored to avoid too many false positives.
    - Matches that are contained in longer matches are discarded. Only the longest match is kept.

## Supported Document Types

- [x] RFCXML
- [x] Markdown
- [x] Plain Text