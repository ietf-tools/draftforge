# Installation

## Setup

1. Install [Visual Studio Code](https://code.visualstudio.com/)
2. Install [Docker](https://www.docker.com/products/docker-desktop/) if working with the `rfc-editor-drafts` repositories, which rely on devcontainers. Optional otherwise.
3. Launch **Visual Studio Code**. In the left activity bar, click the **Extensions** icon.
4. Search for "`draftforge`" and install one of the following extension packs:
    - If you're part of the RFC Production Center staff, install the [**DraftForge for the RFC Production Center**](https://marketplace.visualstudio.com/items?itemName=ietf.draftforge-rpc) extension pack.
    - Otherwise, install the [**DraftForge for Internet-Draft Authors**](https://marketplace.visualstudio.com/items?itemName=ietf.draftforge-authors).
5. Read the [Usage](usage.md) guide to start using it.

!!! warning
    Do not install the "DraftForge" extension by itself, as you're going to be missing important dependencies. Use one of the two extension packs listed above instead.
    
    They both bundle the core "DraftForge" extension and all the necessary 3rd-party extensions dependencies.

## Optional System Dependencies

GitHub repositories created under the `rfc-editor-drafts` organisation includes a devcontainer image, which contains all the necessary system dependencies. **Therefore, you don't need to install anything listed below.**

If you don't plan on working with these repositories or don't want to use the devcontainer image, you need to manually install these dependencies to be able to use all available features. Note that many of these packages are only used by the RPC and may not be relevant for authors.

!!! note
    All binaries must be accessible from PATH.

- [Python](https://www.python.org/) 3.x with the following packages:
    - [pyang](https://github.com/mbj4668/pyang)
    - [rfc2html](https://github.com/ietf-tools/rfc2html)
    - [rfcdiff](https://github.com/ietf-tools/rfcdiff)
    - [rfcstrip](https://github.com/mbj4668/rfcstrip)
    - [svgcheck](https://github.com/ietf-tools/svgcheck)
    - [xml2rfc](https://github.com/ietf-tools/xml2rfc) with `[pdf]` flag
- [Ruby](https://www.ruby-lang.org/) with the following gems:
    - [kramdown-rfc2629](https://github.com/cabo/kramdown-rfc)
- [bap](https://github.com/ietf-tools/bap)
- [htmlwdiff](https://github.com/ietf-tools/bap/blob/master/htmlwdiff)
- [prep](https://github.com/ietf-tools/bap/blob/master/prep)
