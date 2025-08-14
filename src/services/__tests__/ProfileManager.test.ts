import { ProfileManager } from '../ProfileManager'
import { DatabaseService } from '../DatabaseService'
import { Profile } from '../../models/Profile'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('ProfileManager Integration Tests', () => {
  let profileManager: ProfileManager
  let databaseService: DatabaseService
  let testDbPath: string
  let testDataDir: string

  beforeEach(async () => {
    // Create temporary test database and data directory
    testDataDir = path.join(os.tmpdir(), `ruthenium-test-${Date.now()}`)
    testDbPath = path.join(testDataDir, 'test.db')
    
    await fs.mkdir(testDataDir, { recursive: true })
    
    databaseService = new DatabaseService(testDbPath)
    profileManager = new ProfileManager(databaseService)
    
    await profileManager.initialize()
  })

  afterEach(async () => {
    await profileManager.close()
    
    // Cleanup test files
    try {
      await fs.rm(testDataDir, { recursive: true, force: true })
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error)
    }
  })

  describe('Profile Creation', () => {
    it('should create a profile with valid data', async () => {
      const profile = await profileManager.createProfile('Test Profile', '🧪')
      
      expect(profile).toBeInstanceOf(Profile)
      expect(profile.name).toBe('Test Profile')
      expect(profile.icon).toBe('🧪')
      expect(profile.id).toBeDefined()
      expect(profile.dataPath).toContain(profile.id)
      
      // Verify profile directory was created
      const stats = await fs.stat(profile.dataPath)
      expect(stats.isDirectory()).toBe(true)
      
      // Verify subdirectories were created
      const subdirs = ['cookies', 'cache', 'extensions', 'sessions', 'bookmarks', 'history', 'permissions']
      for (const subdir of subdirs) {
        const subdirPath = path.join(profile.dataPath, subdir)
        const subdirStats = await fs.stat(subdirPath)
        expect(subdirStats.isDirectory()).toBe(true)
      }
      
      // Verify metadata file was created
      const metadataPath = path.join(profile.dataPath, 'profile.json')
      const metadataStats = await fs.stat(metadataPath)
      expect(metadataStats.isFile()).toBe(true)
    })

    it('should create profile with custom settings', async () => {
      const settings = {
        antiFingerprinting: true,
        performanceMode: 'extreme' as const,
        memoryLimit: 1024,
        userAgent: 'Custom User Agent'
      }
      
      const profile = await profileManager.createProfile('Custom Profile', '⚙️', settings)
      
      expect(profile.settings.antiFingerprinting).toBe(true)
      expect(profile.settings.performanceMode).toBe('extreme')
      expect(profile.settings.memoryLimit).toBe(1024)
      expect(profile.settings.userAgent).toBe('Custom User Agent')
    })

    it('should set first profile as active', async () => {
      const profile = await profileManager.createProfile('First Profile', '1️⃣')
      
      const activeProfile = profileManager.getActiveProfile()
      expect(activeProfile.id).toBe(profile.id)
    })

    it('should reject invalid profile names', async () => {
      await expect(profileManager.createProfile('', '❌')).rejects.toThrow('Invalid profile name')
      await expect(profileManager.createProfile('A'.repeat(51), '❌')).rejects.toThrow('Invalid profile name')
      await expect(profileManager.createProfile('Invalid@Name', '❌')).rejects.toThrow('Invalid profile name')
    })

    it('should reject duplicate profile names', async () => {
      await profileManager.createProfile('Duplicate', '1️⃣')
      await expect(profileManager.createProfile('Duplicate', '2️⃣')).rejects.toThrow('Profile with this name already exists')
      await expect(profileManager.createProfile('duplicate', '2️⃣')).rejects.toThrow('Profile with this name already exists')
    })
  })

  describe('Profile Retrieval', () => {
    it('should get all profiles sorted by last used', async () => {
      const profile1 = await profileManager.createProfile('Profile 1', '1️⃣')
      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay
      const profile2 = await profileManager.createProfile('Profile 2', '2️⃣')
      
      const profiles = profileManager.getAllProfiles()
      expect(profiles).toHaveLength(2)
      expect(profiles[0].id).toBe(profile2.id) // Most recent first
      expect(profiles[1].id).toBe(profile1.id)
    })

    it('should get specific profile by ID', async () => {
      const profile = await profileManager.createProfile('Specific Profile', '🎯')
      
      const retrieved = profileManager.getProfile(profile.id)
      expect(retrieved).toBeDefined()
      expect(retrieved!.id).toBe(profile.id)
      expect(retrieved!.name).toBe('Specific Profile')
    })

    it('should return undefined for non-existent profile', () => {
      const retrieved = profileManager.getProfile('non-existent-id')
      expect(retrieved).toBeUndefined()
    })
  })

  describe('Profile Switching', () => {
    it('should switch between profiles', async () => {
      const profile1 = await profileManager.createProfile('Profile 1', '1️⃣')
      const profile2 = await profileManager.createProfile('Profile 2', '2️⃣')
      
      // Initially profile1 should be active (first created)
      expect(profileManager.getActiveProfile().id).toBe(profile1.id)
      
      // Switch to profile2
      await profileManager.switchProfile(profile2.id)
      expect(profileManager.getActiveProfile().id).toBe(profile2.id)
      
      // Switch back to profile1
      await profileManager.switchProfile(profile1.id)
      expect(profileManager.getActiveProfile().id).toBe(profile1.id)
    })

    it('should update last used timestamp when switching', async () => {
      const profile1 = await profileManager.createProfile('Profile 1', '1️⃣')
      const profile2 = await profileManager.createProfile('Profile 2', '2️⃣')
      
      const originalLastUsed = profile1.lastUsed.getTime()
      
      // Wait a bit and switch to profile1
      await new Promise(resolve => setTimeout(resolve, 10))
      await profileManager.switchProfile(profile1.id)
      
      expect(profile1.lastUsed.getTime()).toBeGreaterThan(originalLastUsed)
    })

    it('should reject switching to non-existent profile', async () => {
      await expect(profileManager.switchProfile('non-existent-id')).rejects.toThrow('Profile not found')
    })
  })

  describe('Profile Updates', () => {
    it('should update profile name', async () => {
      const profile = await profileManager.createProfile('Original Name', '📝')
      
      await profileManager.updateProfile(profile.id, { name: 'Updated Name' })
      
      const updated = profileManager.getProfile(profile.id)
      expect(updated!.name).toBe('Updated Name')
    })

    it('should update profile icon', async () => {
      const profile = await profileManager.createProfile('Test Profile', '📝')
      
      await profileManager.updateProfile(profile.id, { icon: '🎨' })
      
      const updated = profileManager.getProfile(profile.id)
      expect(updated!.icon).toBe('🎨')
    })

    it('should update profile settings', async () => {
      const profile = await profileManager.createProfile('Test Profile', '⚙️')
      
      const newSettings = {
        antiFingerprinting: true,
        performanceMode: 'extreme' as const,
        memoryLimit: 2048
      }
      
      await profileManager.updateProfile(profile.id, { settings: newSettings })
      
      const updated = profileManager.getProfile(profile.id)
      expect(updated!.settings.antiFingerprinting).toBe(true)
      expect(updated!.settings.performanceMode).toBe('extreme')
      expect(updated!.settings.memoryLimit).toBe(2048)
    })

    it('should reject invalid name updates', async () => {
      const profile = await profileManager.createProfile('Valid Name', '✅')
      
      await expect(profileManager.updateProfile(profile.id, { name: '' })).rejects.toThrow('Invalid profile name')
      await expect(profileManager.updateProfile(profile.id, { name: 'A'.repeat(51) })).rejects.toThrow('Invalid profile name')
    })

    it('should reject duplicate name updates', async () => {
      const profile1 = await profileManager.createProfile('Profile 1', '1️⃣')
      const profile2 = await profileManager.createProfile('Profile 2', '2️⃣')
      
      await expect(profileManager.updateProfile(profile2.id, { name: 'Profile 1' })).rejects.toThrow('Profile with this name already exists')
    })
  })

  describe('Profile Deletion', () => {
    it('should delete a profile and its data', async () => {
      const profile = await profileManager.createProfile('To Delete', '🗑️')
      const profilePath = profile.dataPath
      
      // Verify profile exists
      expect(profileManager.getProfile(profile.id)).toBeDefined()
      const stats = await fs.stat(profilePath)
      expect(stats.isDirectory()).toBe(true)
      
      // Delete profile
      await profileManager.deleteProfile(profile.id)
      
      // Verify profile is removed
      expect(profileManager.getProfile(profile.id)).toBeUndefined()
      
      // Verify data directory is removed
      try {
        await fs.stat(profilePath)
        fail('Profile directory should have been deleted')
      } catch (error: any) {
        expect(error.code).toBe('ENOENT')
      }
    })

    it('should handle active profile deletion', async () => {
      const profile1 = await profileManager.createProfile('Profile 1', '1️⃣')
      const profile2 = await profileManager.createProfile('Profile 2', '2️⃣')
      
      // Switch to profile1
      await profileManager.switchProfile(profile1.id)
      expect(profileManager.getActiveProfile().id).toBe(profile1.id)
      
      // Delete active profile
      await profileManager.deleteProfile(profile1.id)
      
      // Active profile should switch to remaining profile
      expect(profileManager.getActiveProfile().id).toBe(profile2.id)
    })

    it('should handle deletion of last profile', async () => {
      const profile = await profileManager.createProfile('Last Profile', '🔚')
      
      await profileManager.deleteProfile(profile.id)
      
      expect(() => profileManager.getActiveProfile()).toThrow('No active profile')
      expect(profileManager.getAllProfiles()).toHaveLength(0)
    })

    it('should reject deletion of non-existent profile', async () => {
      await expect(profileManager.deleteProfile('non-existent-id')).rejects.toThrow('Profile not found')
    })
  })

  describe('Profile Data Isolation', () => {
    it('should create isolated data directories', async () => {
      const profile = await profileManager.createProfile('Isolated Profile', '🔒')
      
      await profileManager.isolateProfileData(profile.id)
      
      // Verify all isolation directories exist
      const subdirs = ['cookies', 'cache', 'extensions', 'sessions', 'bookmarks', 'history', 'permissions']
      for (const subdir of subdirs) {
        const subdirPath = path.join(profile.dataPath, subdir)
        const stats = await fs.stat(subdirPath)
        expect(stats.isDirectory()).toBe(true)
      }
    })

    it('should reject isolation for non-existent profile', async () => {
      await expect(profileManager.isolateProfileData('non-existent-id')).rejects.toThrow('Profile not found')
    })
  })

  describe('Profile Backup and Recovery', () => {
    it('should create profile backup', async () => {
      const profile = await profileManager.createProfile('Backup Test', '💾')
      
      const backupPath = await profileManager.createProfileBackup(profile)
      
      expect(backupPath).toContain('profile-' + profile.id)
      expect(backupPath).toContain('.json')
      
      // Verify backup file exists and contains correct data
      const stats = await fs.stat(backupPath)
      expect(stats.isFile()).toBe(true)
      
      const backupData = JSON.parse(await fs.readFile(backupPath, 'utf-8'))
      expect(backupData.profile.id).toBe(profile.id)
      expect(backupData.profile.name).toBe('Backup Test')
      expect(backupData.timestamp).toBeDefined()
      expect(backupData.version).toBe('1.0.0')
    })

    it('should restore profile from backup', async () => {
      // Create and backup a profile
      const originalProfile = await profileManager.createProfile('Original Profile', '📦')
      const backupPath = await profileManager.createProfileBackup(originalProfile)
      
      // Delete the original profile
      await profileManager.deleteProfile(originalProfile.id)
      expect(profileManager.getProfile(originalProfile.id)).toBeUndefined()
      
      // Restore from backup
      const restoredProfile = await profileManager.restoreProfileFromBackup(backupPath)
      
      expect(restoredProfile.id).toBe(originalProfile.id)
      expect(restoredProfile.name).toBe('Original Profile')
      expect(restoredProfile.icon).toBe('📦')
      
      // Verify profile is in memory
      const retrieved = profileManager.getProfile(restoredProfile.id)
      expect(retrieved).toBeDefined()
      expect(retrieved!.name).toBe('Original Profile')
    })

    it('should get profile backups', async () => {
      const profile = await profileManager.createProfile('Backup List Test', '📋')
      
      // Create multiple backups
      const backup1 = await profileManager.createProfileBackup(profile)
      await new Promise(resolve => setTimeout(resolve, 10))
      const backup2 = await profileManager.createProfileBackup(profile)
      
      const backups = await profileManager.getProfileBackups(profile.id)
      
      expect(backups).toHaveLength(2)
      expect(backups).toContain(backup1)
      expect(backups).toContain(backup2)
      // Should be sorted with most recent first
      expect(backups[0]).toBe(backup2)
      expect(backups[1]).toBe(backup1)
    })

    it('should return empty array for profile with no backups', async () => {
      const profile = await profileManager.createProfile('No Backups', '🚫')
      
      const backups = await profileManager.getProfileBackups(profile.id)
      expect(backups).toHaveLength(0)
    })
  })

  describe('ProfileManager State', () => {
    it('should report ready state correctly', () => {
      expect(profileManager.isReady()).toBe(true)
    })

    it('should handle initialization', async () => {
      const newProfileManager = new ProfileManager(new DatabaseService(path.join(testDataDir, 'new.db')))
      
      expect(newProfileManager.isReady()).toBe(false)
      
      await newProfileManager.initialize()
      
      expect(newProfileManager.isReady()).toBe(true)
      
      await newProfileManager.close()
    })

    it('should handle close properly', async () => {
      await profileManager.close()
      
      expect(profileManager.isReady()).toBe(false)
      expect(() => profileManager.getActiveProfile()).toThrow('No active profile')
      expect(profileManager.getAllProfiles()).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close database to simulate error
      await profileManager.close()
      
      await expect(profileManager.createProfile('Error Test', '❌')).rejects.toThrow()
    })

    it('should cleanup on failed profile creation', async () => {
      // Create a profile manager with invalid database path to force failure
      const invalidDbPath = '/invalid/path/test.db'
      const invalidProfileManager = new ProfileManager(new DatabaseService(invalidDbPath))
      
      try {
        await invalidProfileManager.initialize()
      } catch (error) {
        // Expected to fail
      }
      
      // Should handle the error gracefully
      expect(invalidProfileManager.isReady()).toBe(false)
    })
  })

  describe('Persistence', () => {
    it('should persist profiles across restarts', async () => {
      // Create profiles
      const profile1 = await profileManager.createProfile('Persistent 1', '💾')
      const profile2 = await profileManager.createProfile('Persistent 2', '🔄')
      
      // Close and recreate ProfileManager
      await profileManager.close()
      
      const newProfileManager = new ProfileManager(new DatabaseService(testDbPath))
      await newProfileManager.initialize()
      
      // Verify profiles are loaded
      const profiles = newProfileManager.getAllProfiles()
      expect(profiles).toHaveLength(2)
      
      const retrievedProfile1 = newProfileManager.getProfile(profile1.id)
      const retrievedProfile2 = newProfileManager.getProfile(profile2.id)
      
      expect(retrievedProfile1).toBeDefined()
      expect(retrievedProfile1!.name).toBe('Persistent 1')
      expect(retrievedProfile2).toBeDefined()
      expect(retrievedProfile2!.name).toBe('Persistent 2')
      
      await newProfileManager.close()
    })
  })
})