# DraftForge User Guide

- [Install](#install)
- [Usage](#usage)
  - [Validation Checks](#validation-checks)
  - [Tools](#tools)
  - [Snippets](#snippets)
  - [Reference](#reference)

## Install

1. Install [Visual Studio Code](https://code.visualstudio.com/)
2. In the left activity bar, click the **Extensions** icon.
3. Search for "`draftforge`" and install the extension:
    - If you're part of the RFC Production Center, install the **DraftForge for the RFC Production Center** extension pack.
    - Otherwise, install the **DraftForge for Internet-Draft Authors**.

### Optional Dependencies

GitHub repositories created under the `rfc-editor-drafts` organisation includes a devcontainer image, which contains all the necessary dependencies. Therefore,you don't need to install anything listed below.

If you don't plan on working with these repositories or don't want to use the devcontainer image, you need to manually install these dependencies to be able to use all available features. Note that many of these packages are only used by the RPC and maybe not be relevant for authors.

Note that all binaries must be accessible from PATH.

- [Python](https://www.python.org/) 3.x with the following packages:
  - [pyang](https://github.com/mbj4668/pyang)
  - [rfc2html](https://github.com/ietf-tools/rfc2html)
  - [rfcdiff](https://github.com/ietf-tools/rfcdiff)
  - [rfcstrip](https://github.com/mbj4668/rfcstrip)
  - [svgcheck](https://github.com/ietf-tools/svgcheck)
  - [xml2rfc](https://github.com/ietf-tools/xml2rfc)
- [Ruby](https://www.ruby-lang.org/) with the following gems:
  - [kramdown-rfc2629](https://github.com/cabo/kramdown-rfc)
- [bap](https://github.com/ietf-tools/bap)
- [htmlwdiff](https://github.com/ietf-tools/htmlwdiff)
- [prep](https://github.com/ietf-tools/prep)

## Usage

DraftForge features can be accessed from the DraftForge icon <img src="images/icon.png" width="24px" /> in the Activity Bar *(located on the left by default)*.

### Validation Checks

*TODO*

### Tools

*TODO*

### Snippets

*TODO*

### Reference

*TODO*
