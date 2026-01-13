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

## Switching to a different draft

!!! info
    A devcontainer is unique to each draft. Everything you see in the Visual Studio Code window is specific to the draft you opened the devcontainer with. It is an isolated environment with only the `/workspace` path being mapped to the cloned repository on your local machine. As such, you cannot access other drafts you cloned or other paths from within the devcontainer.

    For example, the path `~/drafts/draft-ietf-foo-bar` on your machine will be mapped to `/workspace` in the devcontainer for that draft.

    You can however open multiple devcontainers of different drafts at once.

1. Open Terminal and navigate to the folder containing all drafts. (e.g. `~/drafts`)
2. Follow the instructions from the [Cloning a repository locally](#cloning-a-repository-locally) section.
3. Follow the instructions from the [Open the repository in Visual Studio Code](#open-the-repository-in-visual-studio-code). This will launch a new devcontainer specifically for this draft.

If you no longer need to work on a draft, simply close the Visual Studio Code window for this particular draft. The devcontainer will be stopped automatically. You can come back to it later and continue from the state it was when you left it.

You can have multiple devcontainers opened at the same time. Each window being a specific draft.

You can copy content between windows using the clipboard. However, you cannot access the filesystem of another devcontainer from the integrated terminal. The integrated terminal is bound to the devcontainer context and can only see its isolated environment, with `/workspace` being the only path mapped to the outside.

While you can create temporary files outside the `/workspace` path, you should always work under the `/workspace` path when possible. Because the `/workspace` path is directly mapped to your local machine, its contents will persist even if the devcontainer is destroyed.
