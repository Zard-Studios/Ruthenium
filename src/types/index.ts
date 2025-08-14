// Core types for Ruthenium Browser

export interface Profile {
  id: string
  name: string
  icon: string
  createdAt: Date
  lastUsed: Date
  dataPath: string
  settings: ProfileSettings
  tabs: Tab[]
}

export interface ProfileSettings {
  userAgent?: string
  antiFingerprinting: boolean
  performanceMode: 'standard' | 'extreme'
  memoryLimit?: number
  autoRotateUserAgent: boolean
}

export interface Tab {
  id: string
  profileId: string
  url: string
  title: string
  favicon?: string
  isActive: boolean
  isLoading: boolean
}

export interface BrowserEngine {
  initializeProfile(profile: Profile): Promise<void>
  createTab(profileId: string, url?: string): Promise<Tab>
  closeTab(tabId: string): Promise<void>
  navigateTab(tabId: string, url: string): Promise<void>
  getProfileTabs(profileId: string): Tab[]
  applyUserAgent(profileId: string, userAgent: string): Promise<void>
}

export interface ProfileManager {
  createProfile(name: string, icon: string, settings?: Partial<ProfileSettings>): Promise<Profile>
  deleteProfile(profileId: string): Promise<void>
  switchProfile(profileId: string): Promise<void>
  getActiveProfile(): Profile
  getAllProfiles(): Profile[]
  getProfile(profileId: string): Profile | undefined
  updateProfile(profileId: string, updates: Partial<Pick<Profile, 'name' | 'icon' | 'settings'>>): Promise<void>
  isolateProfileData(profileId: string): Promise<void>
  createProfileBackup(profile: Profile): Promise<string>
  restoreProfileFromBackup(backupPath: string): Promise<Profile>
  getProfileBackups(profileId: string): Promise<string[]>
  initialize(): Promise<void>
  isReady(): boolean
  close(): Promise<void>
}