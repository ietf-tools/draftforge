import { defineStore } from 'pinia'
import { decorationsStore } from 'src/stores/models'

// -> Default Values

const defaultShell = {
  cmd: 'bash',
  args: '-i'
}
switch (process.env.OS_PLATFORM) {
  case 'darwin':
    defaultShell.cmd = 'zsh'
    defaultShell.args = '-i'
    break
  case 'win32':
    defaultShell.cmd = 'pwsh.exe'
    defaultShell.args = '-NoLogo -NoProfile'
    break
}

// -> Editor Store

export const useEditorStore = defineStore('editor', {
  state: () => ({
    animationEffects: true,
    checkForUpdates: true,
    col: 1,
    confirmExit: true,
    content: '',
    cursorBlinking: 'blink',
    cursorStyle: 'line',
    debugDisableUnload: false,
    debugExperimental: false,
    drawerPane: 'DrawerFiles',
    errors: [],
    fontSize: 16,
    formatOnType: true,
    gitMode: 'editor',
    gitName: '',
    gitEmail: '',
    gitSignCommits: true,
    gitUseDefaultSigningKey: true,
    gitUseCredMan: true,
    gitUsername: '',
    gitPassword: '',
    gitPgpKeySet: false,
    gitFingerprint: '',
    gitSafeStorageEnabled: false,
    gitRemotes: [],
    gitCurrentRemote: 'origin',
    gitCurrentBranch: '',
    gitLocalBranches: [],
    gitRemoteBranches: [],
    idnits: {
      total: 0,
      errors: [],
      warnings: [],
      comments: []
    },
    keybindings: 'default',
    lastChangeTimestamp: null,
    line: 1,
    persistSession: true,
    previewPaneShown: false,
    restoreSession: false,
    schemaValidationErrors: 0,
    symbols: [],
    tabSize: 2,
    telemetry: false,
    terminalShell: defaultShell.cmd,
    terminalArgs: defaultShell.args,
    theme: 'ietf-dark',
    translucencyEffects: false,
    validationChecksCurrent: null,
    validationChecksDirty: false,
    validationChecks: {
      articles: 0,
      hyphenation: 0,
      inclusiveLanguage: 0,
      nonAscii: 0,
      placeholders: 0,
      repeatedWords: 0,
      typos: 0
    },
    validationChecksDetails: {
      articles: [],
      hyphenation: [],
      inclusiveLanguage: [],
      nonAscii: [],
      placeholders: [],
      repeatedWords: [],
      typos: []
    },
    wordWrap: true,
    workingDirectory: '',
    workingDirFiles: []
  }),
  getters: {
    hasErrors: (state) => state.errors?.length > 0,
    isDarkTheme: (state) => ['ietf-dark', 'hc-black'].includes(state.theme),
    isGitRepo: (state) => state.workingDirFiles.some(f => f.name === '.git')
  },
  actions: {
    async setGitWorkingDirectory (dir) {
      return window.ipcBridge.setGitWorkingDirectory(dir ?? this.workingDirectory)
    },
    async fetchGitConfig () {
      const conf = await window.ipcBridge.fetchGitConfig()
      if (conf) {
        this.$patch({
          gitName: conf.name,
          gitEmail: conf.email,
          gitSignCommits: conf.signCommits,
          gitUseCredMan: conf.useCredMan,
          gitUsername: conf.username,
          gitPassword: conf.password,
          gitPgpKeySet: conf.pgpKey,
          gitFingerprint: conf.fingerprint,
          gitSafeStorageEnabled: conf.safeStorageEnabled,
          gitCurrentRemote: conf.currentRemote
        })
      }
    },
    async saveGitConfig () {
      window.ipcBridge.emit('updateGitConfig', {
        name: this.gitName,
        email: this.gitEmail,
        signCommits: this.gitSignCommits,
        useCredMan: this.gitUseCredMan,
        username: this.gitUsername,
        password: this.gitPassword,
        currentRemote: this.gitCurrentRemote
      })
    },
    async fetchBranches () {
      const branches = await window.ipcBridge.gitListBranches(this.workingDirectory, this.gitCurrentRemote)
      this.gitCurrentBranch = branches.current ?? ''
      this.gitLocalBranches = branches.local ?? []
      this.gitRemoteBranches = branches.remote ?? []
    },
    async fetchRemotes () {
      this.gitRemotes = await window.ipcBridge.gitListRemotes(this.workingDirectory)
    },
    async clearErrors (skipCheck) {
      // Clear standard checks
      this.errors = []
      for (const key in this.validationChecks) {
        if (key === skipCheck) {
          continue
        }
        this.validationChecks[key] = 0
        this.validationChecksDetails[key] = []
        decorationsStore.get(key)?.clear()
      }
      if (!skipCheck) {
        this.validationChecksDirty = false
      }

      // Clear idnits results
      this.idnits.total = 0
      this.idnits.errors = []
      this.idnits.warnings = []
      this.idnits.comments = []
    },
    setValidationCheckState (key, newState) {
      this.validationChecks[key] = newState
      this.validationChecksDirty = true
    },
    setValidationCheckDetails (key, newArr) {
      this.validationChecksDetails[key] = newArr
    }
  },
  persist: {
    pick: [
      'animationEffects',
      'checkForUpdates',
      'confirmExit',
      'cursorBlinking',
      'cursorStyle',
      'debugDisableUnload',
      'debugExperimental',
      'fontSize',
      'formatOnType',
      'persistSession',
      'previewPaneShown',
      'tabSize',
      'telemetry',
      'terminalShell',
      'terminalArgs',
      'theme',
      'translucencyEffects',
      'wordWrap',
      'workingDirectory'
    ]
  }
})
