import * as vscode from 'vscode'
import { v4 as uuid } from 'uuid'

const CLIENT_ID = '607998'
const AUTHORIZE_URL = 'https://auth.ietf.org/api/openid/authorize'
const TOKEN_URL = 'https://auth.ietf.org/api/openid/token'
const USERINFO_URL = 'https://auth.ietf.org/api/openid/userinfo'
const SESSIONS_SECRET_KEY = 'ietf.sessions'

/**
 * IETF Account Auth Provider
 * @class
 * @implements {vscode.AuthenticationProvider}
 */
export class IetfAuthenticationProvider {
  /**
   * Constructor
   * @param {vscode.ExtensionContext} context
   */
  constructor (context) {
    /** @type {vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>} */
    this._onDidChangeSessions = new vscode.EventEmitter()
    this._initializedDisposable = undefined
    this.secretStorage = context.secrets

    this.accessToken = null
    this.refreshToken = null
    this.expiresAt = Math.floor(Date.now() / 1000) - 1
    this.idToken = null
    this.profile = {}

    this.loginPromise = Promise.withResolvers()

    // Register Auth Provider
    this._disposable = vscode.Disposable.from(
      vscode.authentication.registerAuthenticationProvider(
        'ietf',
        'IETF Account',
        this,
        { supportsMultipleAccounts: false }
      ),
      vscode.window.registerUriHandler({
        handleUri: (uri) =>{ this.handleLoginCallback(uri) }
      })
    )

    // Check for past session to recover
    this.recoverPastSession()

    // Build redirect URI
    const publisher = context.extension.packageJSON.publisher;
    const name = context.extension.packageJSON.name
    this.redirectUri = `${vscode.env.uriScheme}://${publisher}.${name}`
  }

  /**
   * Event fired when authentication sessions change.
   * @type {vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>}
   */
  get onDidChangeSessions () {
    return this._onDidChangeSessions.event
  }

  /**
   * Checks if the user is logged in
   * @type {Boolean}
   */
  get isLoggedIn () {
    return Boolean(this.accessToken && this.refreshToken)
  }

  /**
   * Checks if the access token has expired
   * @type {Boolean}
   */
  get isExpired () {
    return this.expiresAt <= Math.floor(Date.now() / 1000)
  }

  /**
   * Recover past session tokens
   */
  async recoverPastSession () {
    const previousSessionTokens = await this.secretStorage.get('draftforge.ietf.tokens')
    if (previousSessionTokens) {
      console.log('Past session tokens found. Restoring...')
      const tokens = JSON.parse(previousSessionTokens)
      this.accessToken = tokens.accessToken
      this.refreshToken = tokens.refreshToken
      this.expiresAt = tokens.expiresAt
      console.log('Past session tokens restored successfully.')
    }
  }

  /**
   * Login Callback
   * @param {vscode.Uri} uri
   */
  async handleLoginCallback (uri) {
    console.log('Login callback received.')
    const clbQuery = new URLSearchParams(uri.query)

    if (!clbQuery.get('code')) {
      return vscode.window.showErrorMessage('Login cancelled by the user.', { modal: true })
    }
    if (clbQuery.get('state') !== this.stateId) {
      return vscode.window.showErrorMessage('Invalid / Expired Auth State. Try to login again.', { modal: true })
    }

    try {
      console.log('Requesting access token...')
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          code: clbQuery.get('code'),
          redirect_uri: this.redirectUri
        })
      }).then(res => res.json())

      // @ts-ignore
      this.accessToken = res.access_token
      // @ts-ignore
      this.refreshToken = res.refresh_token
      // @ts-ignore
      this.expiresAt = Math.floor(Date.now() / 1000) + (res.expires_in || 0)
      // @ts-ignore
      this.idToken = res.id_token

      await this.secretStorage.store('draftforge.ietf.tokens', JSON.stringify({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt
      }))

      console.log('Access token refreshed successfully.')

      if (await this.fetchUserInfo()) {
        this.loginPromise?.resolve()
      } else {
        throw new Error('Failed to fetch user info.')
      }
    } catch (err) {
      console.log(err)
      this.loginPromise.reject(err.message)
      return vscode.window.showErrorMessage(`Login failed: ${err.message}`, { modal: true })
    }
  }

  /**
   * Fetch user info
   * @returns {Promise<Object>}
   */
  async fetchUserInfo () {
    console.log('Fetching user info...')

    if (!this.isLoggedIn) {
      console.log('Cannot fetch user info. User is not logged in.')
      return
    }

    const res = await fetch(`${USERINFO_URL}?access_token=${this.accessToken}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    }).then(res => { return res.json() })
    if (res) {
      console.log('User info fetched successfully.')
      this.profile = res
    }

    return this.profile
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken () {
    try {
      console.log('Renewing access token...')
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          refresh_token: this.refreshToken,
          redirect_uri: this.redirectUri
        })
      }).then(res => res.json())

      if (res.error) {
        throw new Error(`${res.error}: ${res.error_description}`)
      }

      // @ts-ignore
      this.accessToken = res.access_token
      // @ts-ignore
      this.refreshToken = res.refresh_token
      // @ts-ignore
      this.expiresAt = Math.floor(Date.now() / 1000) + (res.expires_in || 0)
      // @ts-ignore
      this.idToken = res.id_token

      await this.secretStorage.store('draftforge.ietf.tokens', JSON.stringify({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt
      }))

      console.log('Access token refreshed successfully.')
    } catch (err) {
      console.log(`Failed to renew access token: ${err.message}`)
      throw err
    }
  }

  /**
   * Login
   * @param {string[]} scopes
   */
  async login (scopes = []) {
    console.log('Login requested...')
    return await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Signing in to IETF...",
      cancellable: true
    }, async (_, cancelToken) => {
      const externalCancelPromise = Promise.withResolvers()
      cancelToken.onCancellationRequested(ev => {
        externalCancelPromise.reject('User Cancelled')
      })

      this.stateId = uuid()

      if (!scopes.includes('openid')) {
        scopes.push('openid')
      }
      if (!scopes.includes('profile')) {
        scopes.push('profile')
      }
      if (!scopes.includes('email')) {
        scopes.push('email')
      }

      const searchParams = new URLSearchParams([
        ['response_type', 'code'],
        ['client_id', CLIENT_ID],
        ['redirect_uri', this.redirectUri],
        ['scope', scopes.join(' ')],
        ['state', this.stateId]
      ])

      const uri = vscode.Uri.parse(`${AUTHORIZE_URL}?${searchParams.toString()}`)
      await vscode.env.openExternal(uri)

      this.loginPromise = Promise.withResolvers()

      try {
        return await Promise.race([
          this.loginPromise.promise,
          new Promise((_, reject) => setTimeout(() => reject('Cancelled'), 60000)),
          externalCancelPromise.promise
        ])
      } finally {
        this.loginPromise.resolve()
      }
    })
  }

  /**
   * Releases any resources held by this instance.
   */
  dispose() {
    this._disposable?.dispose()
  }

  /**
   * Create an authentication session.
   * @param {string[]} scopes
   * @returns {Promise<vscode.AuthenticationSession>}
   */
  async createSession (scopes) {
    await this.login(scopes)

    const sessionId = uuid()
    console.log(`Creating session ${sessionId}...`)

    const session = {
      id: sessionId,
      accessToken: this.accessToken,
      account: { id: this.profile.email, label: this.profile.name },
      scopes: Array.isArray(scopes) ? [...scopes] : []
    }

    await this.secretStorage.store(SESSIONS_SECRET_KEY, JSON.stringify([session]))

    this._onDidChangeSessions.fire({ added: [session], changed: [], removed: [] })

    console.log('Session created successfully.')

    vscode.window.showInformationMessage(`Logged in as ${this.profile.name}.`)

    return session
  }

  /**
   * Retrieve authentication sessions matching the provided scopes.
   * @param {string[]} scopes - One or more scope identifiers to filter sessions by.
   * @param {vscode.AuthenticationGetSessionOptions} [options] - Optional parameters to control retrieval.
   * @returns {Promise<Array<vscode.AuthenticationSession>>}
   */
  async getSessions (scopes, options) {
    try {
      const allSessions = await this.secretStorage.get(SESSIONS_SECRET_KEY)

      if (allSessions) {
        const sessions = JSON.parse(allSessions)

        if (sessions.length > 0) {
          if (this.isExpired) {
            await this.refreshAccessToken()
            const session = sessions[0]
            session.accessToken = this.accessToken
            this._onDidChangeSessions.fire({ added: [], changed: [session], removed: [] })
            return [session]
          } else {
            return sessions
          }
        }

        return []
      }
    } catch (err) {
      console.log(err)
      await this.secretStorage.store(SESSIONS_SECRET_KEY, JSON.stringify([]))
      this.accessToken = null
      this.refreshToken = null
      this.expiresAt = 0
    }

    return []
  }

  /**
   * Removes the session corresponding to session id.
   * @param {String} sessionId
   */
  async removeSession (sessionId) {
    console.log(`Removing session for ${sessionId}...`)
    const allSessions = await this.secretStorage.get(SESSIONS_SECRET_KEY)
    if (allSessions) {
      let sessions = JSON.parse(allSessions)
      const sessionIdx = sessions.findIndex(s => s.id === sessionId)
      const session = sessions[sessionIdx]
      sessions.splice(sessionIdx, 1)

      await this.secretStorage.store(SESSIONS_SECRET_KEY, JSON.stringify(sessions))

      if (session) {
        this._onDidChangeSessions.fire({ added: [], removed: [session], changed: [] })
      }
    }
  }
}
