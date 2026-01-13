# RPC Workflow

This page details the full workflow for working on a draft by the RPC.

## Prerequisites

1. Install the [GitHub CLI](https://cli.github.com/) on your machine and authenticate:
    - Open Terminal and run the command: `gh auth login`
    - Follow the instructions to login to your GitHub account.
2. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for macOS/Windows. On Linux, install docker from your package manager rather than Docker Desktop.
3. Install [Visual Studio Code](https://code.visualstudio.com/)
4. Launch **Visual Studio Code** and install the extension pack:
    - In the left activity bar, click the **Extensions** icon.
    - Search for "`draftforge`" and install the [**DraftForge for the RFC Production Center**](https://marketplace.visualstudio.com/items?itemName=ietf.draftforge-rpc) extension pack.
5. Create a folder, in the location of your choice, that will contain all drafts (e.g. `~/drafts`).

## Creating a new repository

1. From the [rfc-editor-drafts](https://github.com/rfc-editor-drafts) organization page, click the green **New** button.
2. Enter a repository name. This should match the draft name (without versions), e.g. `draft-ietf-foo-bar`.
3. Enter a description *(usually the full title of the draft)*.
4. Set the repository visibility to **Public**.
5. Set the "Start with a template" to `rfc-editor-drafts/base-template`.
6. Click **Create repository**.

## Cloning a repository locally

1. From the repository page, click the green **Code** button.
2. Select the **GitHub CLI** tab and copy the command (starts with `gh repo clone ...`).
3. Open Terminal and navigate to the folder you created in the [Prerequisites](#prerequisites) section (e.g. `~/drafts`).
4. Paste the command and run it to clone the repository locally. A new folder with the draft name will be created under it (e.g. `~/drafts/draft-ietf-foo-bar`).

## Open the repository in Visual Studio Code

1. Navigate to the cloned repository folder (e.g. `cd draft-ietf-foo-bar`)
2. Run the command to open Visual Studio Code in the current folder: `code .`
3. You'll be prompted in the bottom-right corner of the window to reopen the folder to develop in a container. Click the **Reopen in Container** button to do so. If you missed the prompt or didn't get it, press ++f1++ to open the Command Palette and search for "Dev Containers: Reopen in Container".
4. Wait for the devcontainer to initialize. This can take a while the very first time. Click the "Connecting to Dev Container (show log)" link in the bottom-right corner of the window to follow the progress.
5. Once you see the file listing in the left sidebar, the devcontainer is ready.
6. Select a draft XML/Markdown/TXT file to start working on it.
