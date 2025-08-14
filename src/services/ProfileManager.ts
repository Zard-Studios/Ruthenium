import { Profile as IProfile, ProfileManager as IProfileManager, ProfileSettings } from '../types'
import { Profile } from '../models/Profile'
import { DatabaseService } from './DatabaseService'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export class ProfileManager implements IProfileManager {
  private databaseService: DatabaseService
  private activeProfile: Profile | null = null
  private profiles: Map<string, Profile> = new Map()

  constructor(databaseService?: DatabaseService) {
    this.databaseService = databaseService || new DatabaseService()
  }

  /**
   * Initialize the ProfileManager
   */
  async initialize(): Promise<void> {
    await this.databaseService.initialize()
    await this.loadProfiles()
  }

  /**
   * Load all profiles from database into memory
   */
  private async loadProfiles(): Promise<void> {
    const profileData = await this.databaseService.getAllProfiles()
    this.profiles.clear()
    
    for (const data of profileData) {
      const profile = Profile.fromJSON(data)
      this.profiles.set(profile.id, profile)
    }
  }

  /**
   * Create a new profile with data isolation
   */
  async createProfile(name: string, icon: string, settings?: Partial<ProfileSettings>): Promise<Profile> {
    // Validate input
    if (!Profile.isValidName(name)) {
      throw new Error('Invalid profile name')
    }

    // Check for duplicate names
    const existingProfiles = Array.from(this.profiles.values())
    if (existingProfiles.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Profile with this name already exists')
    }

    // Create profile instance
    const profile = new Profile(name, icon, settings)
    
    try {
      // Create profile data directory with proper isolation
      await this.createProfileDataDirectory(profile)
      
      // Save to database
      await this.databaseService.createProfile(profile.toJSON())
      
      // Add to memory cache
      this.profiles.set(profile.id, profile)
      
      // Set as active if it's the first profile
      if (this.profiles.size === 1) {
        this.activeProfile = profile
      }

      return profile
    } catch (error) {
      // Cleanup on failure
      await this.cleanupFailedProfile(profile.id)
      throw new Error(`Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a profile and all its data
   */
  async deleteProfile(profileId: string): Promise<void> {
    const profile = this.profiles.get(profileId)
    if (!profile) {
      throw new Error('Profile not found')
    }

    try {
      // Create backup before deletion
      await this.createProfileBackup(profile)
      
      // Remove from database
      await this.databaseService.deleteProfile(profileId)
      
      // Remove profile data directory
      await this.removeProfileDataDirectory(profile.dataPath)
      
      // Remove from memory
      this.profiles.delete(profileId)
      
      // Handle active profile change
      if (this.activeProfile?.id === profileId) {
        this.activeProfile = this.profiles.size > 0 ? Array.from(this.profiles.values())[0] : null
      }
    } catch (error) {
      throw new Error(`Failed to delete profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Switch to a different profile
   */
  async switchProfile(profileId: string): Promise<void> {
    const profile = this.profiles.get(profileId)
    if (!profile) {
      throw new Error('Profile not found')
    }

    // Update last used timestamp
    profile.updateLastUsed()
    await this.databaseService.updateProfileLastUsed(profileId)
    
    // Set as active profile
    this.activeProfile = profile
  }

  /**
   * Get the currently active profile
   */
  getActiveProfile(): Profile {
    if (!this.activeProfile) {
      throw new Error('No active profile')
    }
    return this.activeProfile
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): Profile[] {
    return Array.from(this.profiles.values()).sort((a, b) => 
      b.lastUsed.getTime() - a.lastUsed.getTime()
    )
  }

  /**
   * Get a specific profile by ID
   */
  getProfile(profileId: string): Profile | undefined {
    return this.profiles.get(profileId)
  }

  /**
   * Update a profile
   */
  async updateProfile(profileId: string, updates: Partial<Pick<IProfile, 'name' | 'icon' | 'settings'>>): Promise<void> {
    const profile = this.profiles.get(profileId)
    if (!profile) {
      throw new Error('Profile not found')
    }

    // Validate name if being updated
    if (updates.name !== undefined && !Profile.isValidName(updates.name)) {
      throw new Error('Invalid profile name')
    }

    // Check for duplicate names
    if (updates.name !== undefined && updates.name !== profile.name) {
      const existingProfiles = Array.from(this.profiles.values())
      if (existingProfiles.some(p => p.id !== profileId && p.name.toLowerCase() === updates.name!.toLowerCase())) {
        throw new Error('Profile with this name already exists')
      }
    }

    // Apply updates
    if (updates.name) profile.name = updates.name
    if (updates.icon) profile.icon = updates.icon
    if (updates.settings) profile.updateSettings(updates.settings)

    // Save to database
    await this.databaseService.updateProfile(profile.toJSON())
  }

  /**
   * Ensure profile data isolation by creating separate data directories
   */
  async isolateProfileData(profileId: string): Promise<void> {
    const profile = this.profiles.get(profileId)
    if (!profile) {
      throw new Error('Profile not found')
    }

    await this.createProfileDataDirectory(profile)
  }

  /**
   * Create profile backup for recovery
   */
  async createProfileBackup(profile: Profile): Promise<string> {
    const backupDir = path.join(os.homedir(), '.ruthenium-browser', 'backups')
    await fs.mkdir(backupDir, { recursive: true })
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupDir, `profile-${profile.id}-${timestamp}.json`)
    
    const backupData = {
      profile: profile.toJSON(),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
    
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2))
    return backupPath
  }

  /**
   * Restore profile from backup
   */
  async restoreProfileFromBackup(backupPath: string): Promise<Profile> {
    try {
      const backupData = JSON.parse(await fs.readFile(backupPath, 'utf-8'))
      const profileData = backupData.profile as IProfile
      
      // Create new profile instance
      const profile = Profile.fromJSON(profileData)
      
      // Ensure data directory exists
      await this.createProfileDataDirectory(profile)
      
      // Save to database
      await this.databaseService.createProfile(profile.toJSON())
      
      // Add to memory cache
      this.profiles.set(profile.id, profile)
      
      return profile
    } catch (error) {
      throw new Error(`Failed to restore profile from backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get available backups for a profile
   */
  async getProfileBackups(profileId: string): Promise<string[]> {
    const backupDir = path.join(os.homedir(), '.ruthenium-browser', 'backups')
    
    try {
      const files = await fs.readdir(backupDir)
      return files
        .filter(file => file.startsWith(`profile-${profileId}-`) && file.endsWith('.json'))
        .map(file => path.join(backupDir, file))
        .sort()
        .reverse() // Most recent first
    } catch (error) {
      return []
    }
  }

  /**
   * Create isolated data directory for profile
   */
  private async createProfileDataDirectory(profile: Profile): Promise<void> {
    try {
      // Create main profile directory
      await fs.mkdir(profile.dataPath, { recursive: true })
      
      // Create subdirectories for data isolation
      const subdirs = [
        'cookies',
        'cache',
        'extensions',
        'sessions',
        'bookmarks',
        'history',
        'permissions'
      ]
      
      for (const subdir of subdirs) {
        await fs.mkdir(path.join(profile.dataPath, subdir), { recursive: true })
      }
      
      // Create profile metadata file
      const metadataPath = path.join(profile.dataPath, 'profile.json')
      await fs.writeFile(metadataPath, JSON.stringify({
        id: profile.id,
        name: profile.name,
        createdAt: profile.createdAt.toISOString(),
        version: '1.0.0'
      }, null, 2))
      
    } catch (error) {
      throw new Error(`Failed to create profile data directory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Remove profile data directory
   */
  private async removeProfileDataDirectory(dataPath: string): Promise<void> {
    try {
      await fs.rm(dataPath, { recursive: true, force: true })
    } catch (error) {
      // Log error but don't throw - directory might not exist
      console.warn(`Failed to remove profile data directory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Cleanup failed profile creation
   */
  private async cleanupFailedProfile(profileId: string): Promise<void> {
    try {
      // Remove from database if it was created
      await this.databaseService.deleteProfile(profileId).catch(() => {})
      
      // Remove from memory
      this.profiles.delete(profileId)
      
      // Remove data directory if it was created
      const profile = this.profiles.get(profileId)
      if (profile) {
        await this.removeProfileDataDirectory(profile.dataPath)
      }
    } catch (error) {
      console.warn(`Failed to cleanup profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if ProfileManager is ready
   */
  isReady(): boolean {
    return this.databaseService.isReady()
  }

  /**
   * Close the ProfileManager and cleanup resources
   */
  async close(): Promise<void> {
    await this.databaseService.close()
    this.profiles.clear()
    this.activeProfile = null
  }
}