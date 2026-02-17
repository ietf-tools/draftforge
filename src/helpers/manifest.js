import * as vscode from 'vscode'
import { posix } from 'node:path'
import { set } from 'lodash-es'

const manifests = new Map()

const manifestManager = {
  /**
   * Get workspace manifest
   * @param {String} workspacePath Path to workspace
   * @returns {Promise<Object>} Manifest Object
   */
  getManifest: async (workspacePath) => {
    if (manifests.has(workspacePath)) {
      return manifests.get(workspacePath)
    } else {
      return manifestManager.loadFromDisk(workspacePath)
    }
  },
  /**
   * Update a workspace manifest by setting a property path to a value.
   * @param {string} workspacePath - Path to the workspace.
   * @param {string | Array<string>} propPath - Property path to set (dot notation or path array).
   * @param {unknown} propValue - Value to assign at the given property path.
   * @param {boolean} [persistToDisk=false] - Whether to persist the manifest to disk after update.
   * @returns {Promise<void>}
   */
  updateManifest: async (workspacePath, propPath, propValue, persistToDisk = false) => {
    const manifest = manifests.get(workspacePath) || {}
    set(manifest, propPath, propValue)
    return manifestManager.setManifest(workspacePath, manifest, persistToDisk)
  },
  /**
   * Replace workspace manifest with new contents
   * @param {string} workspacePath - Path to the workspace.
   * @param {unknown} value - New manifest contents value
   * @param {boolean} [persistToDisk=false] - Whether to persist the manifest to disk after update.
   * @returns {Promise<void>}
   */
  setManifest: async (workspacePath, value, persistToDisk = false) => {
    manifests.set(workspacePath, value || {})
    if (persistToDisk) {
      return manifestManager.saveToDisk(workspacePath)
    }
  },
  /**
   * Get workspace manifest from disk
   * @param {String} workspacePath Path to workspace
   * @returns {Promise<Object>} Manifest Object
   */
  loadFromDisk: async (workspacePath) => {
    const manifestPath = posix.join(workspacePath, 'manifest.json')

    try {
      const manifestRaw = await vscode.workspace.fs.readFile(vscode.Uri.parse(manifestPath))
      manifests.set(workspacePath, JSON.parse(new TextDecoder().decode(manifestRaw)))
    } catch (err) {
      if (err.code === 'FileNotFound') {
        manifests.set(workspacePath, {})
      } else {
        console.log(err)
        throw new Error('Cannot read repository manifest.json file!')
      }
    }

    return manifests.get(workspacePath) || {}
  },
  /**
   * Save workspace manifest to disk
   * @param {String} workspacePath Path to workspace
   * @returns {Promise<void>}
   */
  saveToDisk: async (workspacePath) => {
    const manifestPath = posix.join(workspacePath, 'manifest.json')
    await vscode.workspace.fs.writeFile(vscode.Uri.parse(manifestPath), new TextEncoder().encode(JSON.stringify(manifests.get(workspacePath) || {}, null, 2)))
  },
  /**
   *
   * @param {String} workspacePath Path to workspace
   * @returns {Boolean} True on success, false if no manifest existed
   */
  unloadManifest: (workspacePath) => {
    return manifests.delete(workspacePath)
  }
}

export default manifestManager
