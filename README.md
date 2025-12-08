<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="media/logo-text-dark.png">
  <img alt="DraftForge" src="media/logo-text-light.png" height="175">
</picture>

[![Release](https://img.shields.io/github/release/ietf-tools/draftforge.svg?style=flat&maxAge=300)](https://github.com/ietf-tools/draftforge/releases)
[![GitHub Issues](https://img.shields.io/github/issues/ietf-tools/draftforge?style=flat&logo=github)](https://github.com/ietf-tools/draftforge/issues)
[![VS Code Installs](https://img.shields.io/visual-studio-marketplace/i/ietf.draftforge?style=flat&label=VS%20Code%20installs&color=blue)](https://marketplace.visualstudio.com/items?itemName=ietf.draftforge)
[![Build + Publish](https://github.com/ietf-tools/draftforge/actions/workflows/build.yml/badge.svg)](https://github.com/ietf-tools/draftforge/actions/workflows/build.yml)

#### A fully featured VS Code extension to write, review, refine and submit Internet-Drafts.

</div>

> [!WARNING] 
> This is alpha release that should only be used for testing and development purposes by IETF / RFC-Editor staff.

IETF DraftForge provide tools, validation checks and snippets for both Internet-Drafts authors and the RFC Production Center.

## Features

- Validation Checks
  - Articles Check
  - Hyphenation Check
  - Inclusive Language Check
  - Non-ASCII Check
  - Placeholders Check
  - Repeated Words Check
  - Typos Check
- Tools
  - Add XML Models
  - Extract `[rfced]` comments
  - Format Document
  - IDNits
  - Open Preview
  - Strip `^M` Line Endings
- Snippets
  - Author Block
  - Date Element
- Reference
  - RFCXML
    - Vocabulary

## Extension Settings

This extension contributes the following settings:

* `draftforge.experience`: Set to `author` *(default)* for an author-centric experience or `rpc` for a RPC staff-centric experience.
* `draftforge.idnitsMode`: The default validation mode to use when running IDNits. Set to `author` *(default)* to be prompted every time or to `normal`, `forgive`, `submission`.
* `draftforge.idnitsOffline`: Whether to run IDNits in offline mode. Any check that requires an internet connection will be skipped. (Defaults to `false`)

## Release Notes

See [Releases](https://github.com/ietf-tools/draftforge/releases) on GitHub for the full release notes.
