import { Profile as IProfile, ProfileSettings, Tab } from '../types'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import os from 'os'

export class Profile implements IProfile {
  public readonly id: string
  public name: string
  public icon: string
  public readonly createdAt: Date
  public lastUsed: Date
  public readonly dataPath: string
  public settings: ProfileSettings
  public tabs: Tab[]

  constructor(
    name: string,
    icon: string,
    settings?: Partial<ProfileSettings>,
    id?: string
  ) {
    this.id = id || uuidv4()
    this.name = name
    this.icon = icon
    this.createdAt = new Date()
    this.lastUsed = new Date()
    this.dataPath = this.generateDataPath()
    this.settings = {
      antiFingerprinting: false,
      performanceMode: 'standard',
      autoRotateUserAgent: false,
      ...settings
    }
    this.tabs = []

    this.validate()
  }

  /**
   * Validates the profile data
   * @throws {Error} If validation fails
   */
  public validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Profile name cannot be empty')
    }

    if (this.name.length > 50) {
      throw new Error('Profile name cannot exceed 50 characters')
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(this.name)) {
      throw new Error('Profile name contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed')
    }

    if (!this.icon || this.icon.trim().length === 0) {
      throw new Error('Profile icon cannot be empty')
    }

    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Profile ID cannot be empty')
    }

    this.validateSettings()
  }

  /**
   * Validates profile settings
   * @throws {Error} If settings validation fails
   */
  private validateSettings(): void {
    if (this.settings.userAgent && this.settings.userAgent.length > 500) {
      throw new Error('User agent string cannot exceed 500 characters')
    }

    if (!['standard', 'extreme'].includes(this.settings.performanceMode)) {
      throw new Error('Performance mode must be either "standard" or "extreme"')
    }

    if (this.settings.memoryLimit && (this.settings.memoryLimit < 128 || this.settings.memoryLimit > 8192)) {
      throw new Error('Memory limit must be between 128MB and 8192MB')
    }

    if (typeof this.settings.antiFingerprinting !== 'boolean') {
      throw new Error('Anti-fingerprinting setting must be a boolean')
    }

    if (typeof this.settings.autoRotateUserAgent !== 'boolean') {
      throw new Error('Auto rotate user agent setting must be a boolean')
    }
  }

  /**
   * Updates the last used timestamp
   */
  public updateLastUsed(): void {
    this.lastUsed = new Date()
  }

  /**
   * Updates profile settings with validation
   * @param newSettings Partial settings to update
   */
  public updateSettings(newSettings: Partial<ProfileSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.validateSettings()
  }

  /**
   * Adds a tab to the profile
   * @param tab Tab to add
   */
  public addTab(tab: Tab): void {
    if (tab.profileId !== this.id) {
      throw new Error('Tab profile ID does not match this profile')
    }
    this.tabs.push(tab)
  }

  /**
   * Removes a tab from the profile
   * @param tabId ID of the tab to remove
   */
  public removeTab(tabId: string): void {
    this.tabs = this.tabs.filter(tab => tab.id !== tabId)
  }

  /**
   * Gets the active tab for this profile
   * @returns Active tab or undefined if no active tab
   */
  public getActiveTab(): Tab | undefined {
    return this.tabs.find(tab => tab.isActive)
  }

  /**
   * Sets a tab as active (deactivates others)
   * @param tabId ID of the tab to activate
   */
  public setActiveTab(tabId: string): void {
    this.tabs.forEach(tab => {
      tab.isActive = tab.id === tabId
    })
  }

  /**
   * Generates a unique data path for the profile
   * @returns Data path string
   */
  private generateDataPath(): string {
    const baseDir = path.join(os.homedir(), '.ruthenium-browser', 'profiles')
    return path.join(baseDir, this.id)
  }

  /**
   * Converts the profile to a plain object for serialization
   * @returns Plain object representation
   */
  public toJSON(): IProfile {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      createdAt: this.createdAt,
      lastUsed: this.lastUsed,
      dataPath: this.dataPath,
      settings: this.settings,
      tabs: this.tabs
    }
  }

  /**
   * Creates a Profile instance from a plain object
   * @param data Plain object data
   * @returns Profile instance
   */
  public static fromJSON(data: IProfile): Profile {
    const profile = new Profile(data.name, data.icon, data.settings, data.id)
    profile.lastUsed = new Date(data.lastUsed)
    profile.tabs = data.tabs || []
    return profile
  }

  /**
   * Validates a profile name without creating an instance
   * @param name Profile name to validate
   * @returns True if valid, false otherwise
   */
  public static isValidName(name: string): boolean {
    try {
      if (!name || name.trim().length === 0) return false
      if (name.length > 50) return false
      if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) return false
      return true
    } catch {
      return false
    }
  }

  /**
   * Validates a user agent string
   * @param userAgent User agent string to validate
   * @returns True if valid, false otherwise
   */
  public static isValidUserAgent(userAgent: string): boolean {
    try {
      if (!userAgent) return true // Optional field
      if (userAgent.length > 500) return false
      return true
    } catch {
      return false
    }
  }
}