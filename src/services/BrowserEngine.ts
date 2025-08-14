import { BrowserWindow, webContents, session, WebContents } from 'electron'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { Tab, Profile, BrowserEngine as IBrowserEngine } from '../types'
import { ProfileDataManager } from './ProfileDataManager'
import { UserAgentManager, UserAgentPreset } from './UserAgentManager'

interface ProfileSession {
  profileId: string
  session: Electron.Session
  dataPath: string
  tabs: Map<string, TabInstance>
}

interface TabInstance {
  tab: Tab
  webContents: WebContents
  window?: BrowserWindow
}

export class BrowserEngine implements IBrowserEngine {
  private profileSessions = new Map<string, ProfileSession>()
  private activeTabs = new Map<string, TabInstance>()
  private mainWindow?: BrowserWindow
  private userAgentManager: UserAgentManager

  constructor(mainWindow?: BrowserWindow) {
    this.mainWindow = mainWindow
    this.userAgentManager = new UserAgentManager()
    
    // Set up user agent rotation handler
    this.userAgentManager.onRotation = (userAgent: UserAgentPreset) => {
      this.handleUserAgentRotation(userAgent)
    }
  }

  async initializeProfile(profile: Profile): Promise<void> {
    if (this.profileSessions.has(profile.id)) {
      return // Profile already initialized
    }

    // Create profile data directories
    const profilePaths = await ProfileDataManager.createProfileDirectories(profile)

    // Create isolated session for this profile with specific data path
    const sessionName = `profile-${profile.id}`
    const profileSession = session.fromPartition(sessionName, {
      cache: true
    })

    // Configure session with profile-specific settings
    await this.configureProfileSession(profileSession, profile, profilePaths)

    const profileSessionData: ProfileSession = {
      profileId: profile.id,
      session: profileSession,
      dataPath: profilePaths.root,
      tabs: new Map()
    }

    this.profileSessions.set(profile.id, profileSessionData)

    // Initialize existing tabs for this profile
    for (const tab of profile.tabs) {
      await this.restoreTab(tab, profileSessionData)
    }
  }

  async createTab(profileId: string, url?: string): Promise<Tab> {
    const profileSession = this.profileSessions.get(profileId)
    if (!profileSession) {
      throw new Error(`Profile ${profileId} not initialized`)
    }

    const tabId = uuidv4()
    const tab: Tab = {
      id: tabId,
      profileId,
      url: url || 'about:blank',
      title: 'New Tab',
      favicon: undefined,
      isActive: false,
      isLoading: false
    }

    // Create webContents for this tab with the profile's session
    const tabWebContents = webContents.create({
      session: profileSession.session,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true
    })

    const tabInstance: TabInstance = {
      tab,
      webContents: tabWebContents
    }

    // Setup event handlers for the tab
    this.setupTabEventHandlers(tabInstance)

    // Store tab instances
    profileSession.tabs.set(tabId, tabInstance)
    this.activeTabs.set(tabId, tabInstance)

    // Navigate to URL if provided
    if (url && url !== 'about:blank') {
      await this.navigateTab(tabId, url)
    }

    return tab
  }

  async closeTab(tabId: string): Promise<void> {
    const tabInstance = this.activeTabs.get(tabId)
    if (!tabInstance) {
      throw new Error(`Tab ${tabId} not found`)
    }

    const profileSession = this.profileSessions.get(tabInstance.tab.profileId)
    if (profileSession) {
      profileSession.tabs.delete(tabId)
    }

    // Clean up webContents
    if (!tabInstance.webContents.isDestroyed()) {
      tabInstance.webContents.destroy()
    }

    // Close window if it exists
    if (tabInstance.window && !tabInstance.window.isDestroyed()) {
      tabInstance.window.close()
    }

    this.activeTabs.delete(tabId)
  }

  async navigateTab(tabId: string, url: string): Promise<void> {
    const tabInstance = this.activeTabs.get(tabId)
    if (!tabInstance) {
      throw new Error(`Tab ${tabId} not found`)
    }

    if (tabInstance.webContents.isDestroyed()) {
      throw new Error(`Tab ${tabId} webContents is destroyed`)
    }

    // Update tab state
    tabInstance.tab.url = url
    tabInstance.tab.isLoading = true

    // Navigate to the URL
    await tabInstance.webContents.loadURL(url)
  }

  getProfileTabs(profileId: string): Tab[] {
    const profileSession = this.profileSessions.get(profileId)
    if (!profileSession) {
      return []
    }

    return Array.from(profileSession.tabs.values()).map(instance => ({ ...instance.tab }))
  }

  async applyUserAgent(profileId: string, userAgent: string): Promise<void> {
    const profileSession = this.profileSessions.get(profileId)
    if (!profileSession) {
      throw new Error(`Profile ${profileId} not initialized`)
    }

    // Apply user agent to the session
    profileSession.session.setUserAgent(userAgent)

    // Apply to all existing tabs in this profile
    for (const tabInstance of profileSession.tabs.values()) {
      if (!tabInstance.webContents.isDestroyed()) {
        tabInstance.webContents.setUserAgent(userAgent)
      }
    }
  }

  // User Agent Management Methods
  getUserAgentPresets(): UserAgentPreset[] {
    return this.userAgentManager.getAllPresets()
  }

  getUserAgentPresetsByCategory(category: UserAgentPreset['category']): UserAgentPreset[] {
    return this.userAgentManager.getPresetsByCategory(category)
  }

  getUserAgentPresetById(id: string): UserAgentPreset | undefined {
    return this.userAgentManager.getPresetById(id)
  }

  addCustomUserAgentPreset(preset: Omit<UserAgentPreset, 'id'>): UserAgentPreset {
    return this.userAgentManager.addCustomPreset(preset)
  }

  removeCustomUserAgentPreset(id: string): boolean {
    return this.userAgentManager.removeCustomPreset(id)
  }

  async applyUserAgentPreset(profileId: string, presetId: string): Promise<void> {
    const preset = this.userAgentManager.getPresetById(presetId)
    if (!preset) {
      throw new Error(`User agent preset ${presetId} not found`)
    }

    await this.applyUserAgent(profileId, preset.userAgent)
  }

  async applyRandomUserAgent(profileId: string, category?: UserAgentPreset['category']): Promise<UserAgentPreset> {
    const randomPreset = this.userAgentManager.getRandomUserAgent(category)
    await this.applyUserAgent(profileId, randomPreset.userAgent)
    return randomPreset
  }

  startUserAgentRotation(profileId: string, intervalMs: number = 300000, category?: UserAgentPreset['category']): void {
    // Store rotation settings for this profile
    const profileSession = this.profileSessions.get(profileId)
    if (!profileSession) {
      throw new Error(`Profile ${profileId} not initialized`)
    }

    // Start rotation for this specific profile
    this.userAgentManager.startRotation(intervalMs, category)
  }

  stopUserAgentRotation(): void {
    this.userAgentManager.stopRotation()
  }

  isUserAgentRotationEnabled(): boolean {
    return this.userAgentManager.isRotationEnabled()
  }

  validateUserAgent(userAgentString: string): boolean {
    return this.userAgentManager.validateUserAgent(userAgentString)
  }

  parseUserAgent(userAgentString: string): Partial<UserAgentPreset> {
    return this.userAgentManager.parseUserAgent(userAgentString)
  }

  getUserAgentStatistics(): {
    totalPresets: number
    presetsByCategory: Record<string, number>
    customPresets: number
    rotationEnabled: boolean
  } {
    return this.userAgentManager.getStatistics()
  }

  // Get tab instance for external access
  getTabInstance(tabId: string): TabInstance | undefined {
    return this.activeTabs.get(tabId)
  }

  // Get profile session for external access
  getProfileSession(profileId: string): ProfileSession | undefined {
    return this.profileSessions.get(profileId)
  }

  // Data isolation methods
  async clearProfileData(profileId: string, dataTypes: {
    cache?: boolean
    cookies?: boolean
    localStorage?: boolean
    sessionStorage?: boolean
    downloads?: boolean
  }): Promise<void> {
    const profileSession = this.profileSessions.get(profileId)
    if (!profileSession) {
      throw new Error(`Profile ${profileId} not initialized`)
    }

    // Clear data using ProfileDataManager
    await ProfileDataManager.clearProfileData(profileId, dataTypes)

    // Also clear session data
    if (dataTypes.cache) {
      await profileSession.session.clearCache()
    }

    if (dataTypes.cookies) {
      await profileSession.session.clearStorageData({
        storages: ['cookies']
      })
    }

    if (dataTypes.localStorage || dataTypes.sessionStorage) {
      const storages: string[] = []
      if (dataTypes.localStorage) storages.push('localstorage')
      if (dataTypes.sessionStorage) storages.push('sessionstorage')
      
      await profileSession.session.clearStorageData({
        storages
      })
    }
  }

  async getProfileDataSize(profileId: string): Promise<number> {
    return ProfileDataManager.getProfileDataSize(profileId)
  }

  async verifyDataIsolation(profileId1: string, profileId2: string): Promise<boolean> {
    return ProfileDataManager.verifyDataIsolation(profileId1, profileId2)
  }

  // User agent rotation handler
  private async handleUserAgentRotation(userAgent: UserAgentPreset): Promise<void> {
    // Apply the rotated user agent to all profiles that have auto-rotation enabled
    for (const [profileId, profileSession] of this.profileSessions.entries()) {
      // Check if this profile has auto-rotation enabled in its settings
      // This would be stored in the profile settings
      try {
        await this.applyUserAgent(profileId, userAgent.userAgent)
      } catch (error) {
        console.error(`Failed to apply rotated user agent to profile ${profileId}:`, error)
      }
    }
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    // Stop user agent rotation
    this.stopUserAgentRotation()

    // Close all tabs
    for (const tabId of this.activeTabs.keys()) {
      await this.closeTab(tabId)
    }

    // Clear sessions
    this.profileSessions.clear()
  }

  private async configureProfileSession(session: Electron.Session, profile: Profile, profilePaths: any): Promise<void> {
    // Set up profile-specific configurations
    
    // Configure permissions
    session.setPermissionRequestHandler((webContents, permission, callback) => {
      // Default deny for now - can be made configurable per profile later
      callback(false)
    })

    // Configure security settings
    session.webRequest.onBeforeSendHeaders((details, callback) => {
      // Apply user agent if set in profile settings
      if (profile.settings.userAgent) {
        details.requestHeaders['User-Agent'] = profile.settings.userAgent
      }
      
      callback({ requestHeaders: details.requestHeaders })
    })

    // Configure anti-fingerprinting if enabled
    if (profile.settings.antiFingerprinting) {
      await this.configureAntiFingerprinting(session)
    }

    // Configure data isolation settings
    await this.configureDataIsolation(session, profile, profilePaths)
  }

  private async configureAntiFingerprinting(session: Electron.Session): Promise<void> {
    // Basic anti-fingerprinting measures
    session.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = details.responseHeaders || {}
      
      // Remove potentially identifying headers
      delete responseHeaders['server']
      delete responseHeaders['x-powered-by']
      
      callback({ responseHeaders })
    })
  }

  private async configureDataIsolation(session: Electron.Session, profile: Profile, profilePaths: any): Promise<void> {
    // Configure profile-specific storage paths
    
    // Set up isolated storage for cookies, local storage, etc.
    // The session partition already provides basic isolation, but we can enhance it
    
    // Configure download behavior for this profile
    session.on('will-download', (event, item, webContents) => {
      // Set download path to profile-specific downloads folder
      item.setSavePath(join(profilePaths.downloads, item.getFilename()))
    })
    
    // Configure spell checker dictionary path
    session.setSpellCheckerDictionaryDownloadURL('https://dictionaries.chromium.org/')
    
    // Set up profile-specific preload scripts if needed
    session.setPreloads([])
    
    // Configure certificate verification for this profile
    session.setCertificateVerifyProc((request, callback) => {
      // Use default verification for now
      callback(0)
    })

    // Configure additional isolation settings
    session.webRequest.onBeforeRequest((details, callback) => {
      // Log requests for debugging (can be disabled in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`Profile ${profile.id} request: ${details.url}`)
      }
      callback({})
    })
  }

  private setupTabEventHandlers(tabInstance: TabInstance): void {
    const { webContents, tab } = tabInstance

    // Handle page title updates
    webContents.on('page-title-updated', (event, title) => {
      tab.title = title
    })

    // Handle favicon updates
    webContents.on('page-favicon-updated', (event, favicons) => {
      if (favicons.length > 0) {
        tab.favicon = favicons[0]
      }
    })

    // Handle loading state
    webContents.on('did-start-loading', () => {
      tab.isLoading = true
    })

    webContents.on('did-finish-load', () => {
      tab.isLoading = false
    })

    webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      tab.isLoading = false
      console.error(`Failed to load ${validatedURL}: ${errorDescription}`)
    })

    // Handle navigation
    webContents.on('did-navigate', (event, url) => {
      tab.url = url
    })

    webContents.on('did-navigate-in-page', (event, url) => {
      tab.url = url
    })
  }

  private async restoreTab(tab: Tab, profileSession: ProfileSession): Promise<void> {
    // Create webContents for restored tab
    const tabWebContents = webContents.create({
      session: profileSession.session,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true
    })

    const tabInstance: TabInstance = {
      tab: { ...tab },
      webContents: tabWebContents
    }

    // Setup event handlers
    this.setupTabEventHandlers(tabInstance)

    // Store tab instances
    profileSession.tabs.set(tab.id, tabInstance)
    this.activeTabs.set(tab.id, tabInstance)

    // Restore the tab's URL if it's not blank
    if (tab.url && tab.url !== 'about:blank') {
      try {
        await tabWebContents.loadURL(tab.url)
      } catch (error) {
        console.error(`Failed to restore tab ${tab.id}:`, error)
      }
    }
  }
}