# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A VS Code extension (`ietf.draftforge`) providing validation checks, tools and snippets for authoring
Internet-Drafts and RFCs, aimed both at draft authors and at RFC Production Center (RPC) staff. It is
shipped through two extension packs in [extension-packs/](extension-packs/), never installed standalone.

Plain JavaScript ESM (`"type": "module"`), no TypeScript — but type-checked from JSDoc via
[tsconfig.json](tsconfig.json) (`allowJs`, `noEmit`), so keep the JSDoc annotations accurate. `// @ts-ignore`
is used where the code attaches custom properties to VS Code objects (e.g. `diag.match`).

## Commands

```bash
npm install                  # extension deps
npm run compile              # rollup bundle -> dist/extension.js (only needed for packaging)
npx oxlint src/              # lint (oxlint, categories.correctness = error)
npx oxfmt --check src/       # check formatting; drop --check to write
```

The idnits webview is a separate npm package that must be built before the IDNits panel will work —
its output lands in `media/webviews/`, which is **gitignored**, so a fresh clone has no webview assets:

```bash
cd webviews/idnits && npm install && npm run build   # -> media/webviews/idnits/{app.js,app.css}
```

Run the extension with the "Run Extension" launch config (F5), which loads `src/extension.js` directly —
`npm run compile` is not part of the dev loop.

**There is no test suite.** [.vscode-test.mjs](.vscode-test.mjs) points at a `test/` directory that does not
exist and `@vscode/test-cli` is not installed. Verify changes by running the extension, or by exercising
pure helpers with `node` directly (they only import `vscode` where unavoidable — keep new helpers in
[src/helpers/](src/helpers/) free of `vscode` imports where possible so they stay testable that way).

Formatting is **oxfmt**, not Prettier: no semicolons, single quotes, no trailing commas. Running Prettier
will reformat the whole repo incorrectly.

## Architecture

### Registration flow

[src/extension.js](src/extension.js) `activate()` creates the three shared objects that nearly every feature
receives by parameter injection, then calls each feature's `register*Command(context, ...)`:

- `outputView` — an `OutputWebviewView` ([src/views/neue-output.js](src/views/neue-output.js)), the DraftForge
  panel at the bottom. Tools write results here.
- `diagnosticCollection` — a single `draftforgeChecks` collection. Checks write here, surfacing in the
  Problems panel.
- `context` — subscriptions/secrets.

It finishes with `setContext('draftforge.isReady', true)`, which is the `when` clause gating every view in
`package.json`.

### Two feature families

**Checks** produce `vscode.Diagnostic`s. Registered from
[src/views/checks.js](src/views/checks.js) (not from `extension.js`), because they share the module-level
`ignores` map. Each check command takes `(context, diagnosticCollection, ignores)` and follows the same shape
— see [src/commands/repeated-words.js](src/commands/repeated-words.js) as the reference implementation:
guard on active editor / `uri.scheme === 'output'` / `languageId`, honour `clearFirst`, set
`diag.source = 'DraftForge'`, `diag.code = <checkId>`, `diag.match = <matched term>` (the last two drive the
ignore mechanism), then append to the collection and focus the Problems panel.

**Tools** write to `outputView`. Registered from `extension.js`, listed in
[src/views/tools.js](src/views/tools.js).

### Adding a check or tool touches four places

There is a deliberate indirection: tree items carry an `id`, and the view's `runCheck` / `runTool` handler
`switch`es on that id to `executeCommand` the real command. So a new feature needs:

1. `src/commands/<name>.js` exporting `register*Command`
2. the `register*` call — in `checks.js` for checks, `extension.js` for tools
3. the item in the provider's `checks`/`tools` array **and** the matching `case` in the `switch`
4. `contributes.commands` in [package.json](package.json)

Tools are filtered per context in `ToolsProvider.populateTools()` using `flags` computed from the active
editor's `languageId` and `draftforge.experience` (`author` vs `rpc`) — falsy array entries are filtered out.
The provider re-populates on `onDidChangeActiveTextEditor` and on config change.

### External CLI wrapping

`xml2rfc`, `kramdown-rfc` and `svgcheck` are external executables invoked via `exec`, with the binary path
and flags always read from workspace configuration (`draftforge.xml2rfc.executablePath`,
`<type>OutputFlags`, etc.) — never hardcoded. The pattern: mkdtemp, write the buffer's current text to a temp
file (xml2rfc reads from disk, so unsaved buffers must be materialised), run, parse `stderr`, clean up.

Parsing of xml2rfc's `stderr` is shared in [src/helpers/xml2rfc.js](src/helpers/xml2rfc.js) and used by all
four callers ([xml-output.js](src/commands/xml-output.js), [md-output.js](src/commands/md-output.js),
[xml-v2v3.js](src/commands/xml-v2v3.js), [xml-preview.js](src/commands/xml-preview.js)). Diagnostics are not
one line each: a message ending in `:` is continued by the offending content on the following lines, and
non-diagnostic trailers (` Created file …`) must not be swallowed into it. Put any change to that format
handling in the helper rather than at a call site.

`draftforge.xmlV2v3Output` is the exception that runs against the file on disk, so it forces a save first.

### Output view

`OutputWebviewView` buffers lines in `#lines` and pushes each new one to the webview incrementally, falling
back to a full re-render when the view resolves late (the view may not exist when a command starts writing).
`appendLineWithRanges` renders clickable line links that navigate into the URI last set by `setFileUri` —
so always call `setFileUri` before writing. The webview body is `white-space: pre`, so indentation in text
is preserved.

### Per-workspace state: manifest.json

[src/helpers/manifest.js](src/helpers/manifest.js) reads/writes a `manifest.json` at the workspace root,
cached in memory per workspace path. It stores "ignore this warning" decisions under
`draftforge.ignores.<scope>.<checkId>`, where scope is `global` or an md5 of the workspace-relative document
path (per-document scope). Checks read these into the in-memory `ignores` map on document open.

### Authentication

[src/authentication/ietf.js](src/authentication/ietf.js) implements a `vscode.AuthenticationProvider` for
IETF accounts over OIDC against `auth.ietf.org`, with tokens in `context.secrets` and the OAuth callback
handled through a registered `UriHandler` on `vscode.env.uriScheme`. The Snippets view separately uses the
built-in `github` auth session to fetch RPC snippet tarballs into `context.globalStorageUri`.

## Packaging and releases

Release is a manually dispatched GitHub Action ([.github/workflows/build.yml](.github/workflows/build.yml)).
Two things there differ from the checked-in state and explain apparent inconsistencies:

- `package.json` `main` is `./src/extension.js` in the repo; CI rewrites it to `./dist/extension.js` before
  `vsce package`. Don't "fix" it to point at `dist`.
- `README-vscode.md` replaces `README.md` in the published extension, so the feature list exists in both
  files and should be updated in both.

The next version number is derived from commit messages by `ietf-tools/semver-action`: `fix`, `bugfix`,
`perf`, `refactor`, `test`, `tests`, `chore` bump the patch; `feat` bumps the minor. Use conventional-commit
prefixes accordingly — they are load-bearing, not cosmetic.

User documentation lives in [mkdocs/](mkdocs/) and publishes to <https://draftforge.ietf.org>; user-facing
feature changes generally need a page update there.
