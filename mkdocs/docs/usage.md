# Usage

First, open a git repository folder which contains (or will contain) Internet-Drafts.

## Create / Open an Internet-Draft

To create a new Internet-Draft, from the **File** menu, select **New File...**. A dropdown menu will appear with the following options:

- Internet-Draft - Markdown
- Internet-Draft - RFCXML

Choose your preferred format to get started.

!!! warning
    Make sure to first save your draft, with proper naming, in your git repository folder. Some validation checks and tools require the file to exist on disk.

For existing drafts, simply open the desired draft from the Explorer tab.

## Use DraftForge

DraftForge features can be accessed from the DraftForge icon ![DraftForge Icon](assets/icon.png) in the **Activity Bar** *(located on the left by default)*.

The DraftForge sidebar is composed of 4 sections:

### Validation Checks

Validation checks analyze your document for errors or potential issues.

Any issues will be marked with a wavy underline. The color of the underline varies depending on the severity (🔴 red for errors, 🟡 yellow for warnings and 🔵 blue for info). You can mouse-over the match to view details about the issue.

All issues are also listed under the "**Problems**" panel at the bottom of the screen. Click on an issue to jump to it in the document.

Read the [Validation Checks](checks/articles.md) section to learn more.

#### Ignoring warnings

You can ignore a warning across a document or the whole repository, by right-clicking on the issue *(either from the "Problems" panel or directly in the document)* and selecting of the following options:

- Ignore warnings of this term across the repo
- Ignore warnings of this term for this document only

!!! note
    When a warning is ignored, all instances of that warning will be silenced. For example, if you ignore a warning for a match of `abcdef`, then all other matches of `abcdef` will be ignored.

### Tools

Tools can make modifications on your document or perform certain actions like run external tools or extract sections.

Some tools require specific system dependencies to work, as detailed in the [Installation](install.md#optional-system-dependencies) section. These dependencies are already included when using devcontainers from the [rfc-editor-drafts](https://github.com/rfc-editor-drafts) GitHub repositories.

Read the [Tools](tools/add-xml-models.md) section to learn more.

### Snippets

Snippets are templates to quickly insert often used bits of content. For example, you can quickly insert an author block with all the necessary tags.

Many snippets include placeholders. Once you insert a snippet, you can edit the value of the first placeholder and then press ++tab++ to jump to the next placeholder.

Read the [Snippets](snippets/rfcxml.md) section to learn more.

### Reference

The reference section includes a list of links to documentation and wiki entries to help authors write Internet-Drafts.

Read the [Reference](reference.md) section to learn more.