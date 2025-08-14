import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ExtensionManager } from '../ExtensionManager'
import { DatabaseService } from '../DatabaseService'
import { ProfileManager } from '../ProfileManager'
import { Extension, ExtensionManifest, ExtensionInstallOptions } from '../../types/extension'
import * as fs from 'fs/promises'
import * as path from 'path'

// Mock fs module
vi.mock('fs/promises')
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn(),
    digest: vi.fn(() => 'mock-hash-1234567890123456789012345678901234567890123456789012345678901234')
  }))
}))

describe('ExtensionManager', () => {
  let extensionManager: ExtensionManager
  let mockDatabaseService: DatabaseService
  let mockProfileManager: ProfileManager
  let mockDb: any

  const mockExtensionManifest: ExtensionManifest = {
    manifest_version: 2,
    name: 'Test Extension',
    version: '1.0.0',
    description: 'A test extension',
    author: 'Test Author',
    permissions: ['tabs', 'storage'],
    icons: { '48': 'icon48.png', '128': 'icon128.png' }
  }

  beforeEach(async () => {
    // Mock database
    mockDb = {
      run: vi.fn().mockResolvedValue(undefined),
      all: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(undefined)
    }

    mockDatabaseService = {
      getDatabase: vi.fn().mockResolvedValue(mockDb)
    } as any

    mockProfileManager = {} as ProfileManager

    extensionManager = new ExtensionManager(mockDatabaseService, mockProfileManager)

    // Mock fs operations
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockExtensionManifest))
    vi.mocked(fs.readdir).mockResolvedValue([])
    vi.mocked(fs.copyFile).mockResolvedValue(undefined)
    vi.mocked(fs.rm).mockResolvedValue(undefined)

    await extensionManager.initialize()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialize', () => {
    it('should create extensions directory', async () => {
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('extensions'),
        { recursive: true }
      )
    })

    it('should load installed extensions from database', async () => {
      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM extensions')
    })

    it('should load profile extension states from database', async () => {
      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM profile_extension_states')
    })
  })

  describe('installExtension', () => {
    const mockExtensionPath = '/path/to/extension'
    const mockOptions: ExtensionInstallOptions = {
      source: 'local',
      autoEnable: true,
      profileId: 'profile-1'
    }

    beforeEach(() => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'manifest.json', isDirectory: () => false } as any,
        { name: 'background.js', isDirectory: () => false } as any
      ])
    })

    it('should install extension successfully', async () => {
      const extension = await extensionManager.installExtension(mockExtensionPath, mockOptions)

      expect(extension).toMatchObject({
        name: 'Test Extension',
        version: '1.0.0',
        description: 'A test extension',
        author: 'Test Author',
        manifestVersion: 2,
        permissions: ['tabs', 'storage'],
        isEnabled: true,
        profileId: 'profile-1'
      })
    })

    it('should read and validate manifest', async () => {
      await extensionManager.installExtension(mockExtensionPath, mockOptions)

      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(mockExtensionPath, 'manifest.json'),
        'utf-8'
      )
    })

    it('should copy extension files to extensions directory', async () => {
      await extensionManager.installExtension(mockExtensionPath, mockOptions)

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('mock-hash-1234567890123456789012'),
        { recursive: true }
      )
    })

    it('should save extension to database', async () => {
      await extensionManager.installExtension(mockExtensionPath, mockOptions)

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO extensions'),
        expect.arrayContaining([
          'mock-hash-1234567890123456789012',
          'Test Extension',
          '1.0.0'
        ])
      )
    })

    it('should create profile extension state for profile-specific installation', async () => {
      await extensionManager.installExtension(mockExtensionPath, mockOptions)

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO profile_extension_states'),
        expect.arrayContaining([
          'profile-1',
          'mock-hash-1234567890123456789012'
        ])
      )
    })

    it('should throw error for invalid manifest', async () => {
      const invalidManifest = { name: 'Test', version: '1.0.0' } // Missing manifest_version
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidManifest))

      await expect(
        extensionManager.installExtension(mockExtensionPath, mockOptions)
      ).rejects.toThrow('Invalid or unsupported manifest version')
    })

    it('should throw error for unsupported manifest version', async () => {
      const invalidManifest = { ...mockExtensionManifest, manifest_version: 1 }
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidManifest))

      await expect(
        extensionManager.installExtension(mockExtensionPath, mockOptions)
      ).rejects.toThrow('Invalid or unsupported manifest version')
    })
  })

  describe('uninstallExtension', () => {
    const extensionId = 'test-extension-id'
    const profileId = 'profile-1'

    beforeEach(() => {
      // Mock installed extension
      const mockExtension: Extension = {
        id: extensionId,
        name: 'Test Extension',
        version: '1.0.0',
        description: 'Test',
        author: 'Test Author',
        manifestVersion: 2,
        permissions: [],
        icons: {},
        isEnabled: true,
        installDate: new Date()
      }
      
      extensionManager['installedExtensions'].set(extensionId, mockExtension)
    })

    it('should uninstall extension successfully', async () => {
      await extensionManager.uninstallExtension(extensionId)

      expect(fs.rm).toHaveBeenCalledWith(
        expect.stringContaining(extensionId),
        { recursive: true, force: true }
      )
      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM extensions WHERE id = ?',
        [extensionId]
      )
    })

    it('should remove profile extension state for profile-specific uninstall', async () => {
      await extensionManager.uninstallExtension(extensionId, profileId)

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM profile_extension_states WHERE profile_id = ? AND extension_id = ?',
        [profileId, extensionId]
      )
    })

    it('should throw error for non-existent extension', async () => {
      await expect(
        extensionManager.uninstallExtension('non-existent-id')
      ).rejects.toThrow('Extension non-existent-id not found')
    })
  })

  describe('enableExtensionForProfile', () => {
    const extensionId = 'test-extension-id'
    const profileId = 'profile-1'

    beforeEach(() => {
      const mockExtension: Extension = {
        id: extensionId,
        name: 'Test Extension',
        version: '1.0.0',
        description: 'Test',
        author: 'Test Author',
        manifestVersion: 2,
        permissions: [],
        icons: {},
        isEnabled: false,
        installDate: new Date()
      }
      
      extensionManager['installedExtensions'].set(extensionId, mockExtension)
      
      // Set up profile extension state
      const profileStates = new Map()
      profileStates.set(extensionId, {
        extensionId,
        profileId,
        isEnabled: false,
        settings: {},
        permissions: []
      })
      extensionManager['profileExtensionStates'].set(profileId, profileStates)
    })

    it('should enable extension for profile', async () => {
      await extensionManager.enableExtensionForProfile(profileId, extensionId)

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE profile_extension_states'),
        expect.arrayContaining([1, profileId, extensionId])
      )
    })

    it('should throw error for non-existent extension', async () => {
      await expect(
        extensionManager.enableExtensionForProfile(profileId, 'non-existent-id')
      ).rejects.toThrow('Extension non-existent-id not found')
    })
  })

  describe('disableExtensionForProfile', () => {
    const extensionId = 'test-extension-id'
    const profileId = 'profile-1'

    beforeEach(() => {
      const mockExtension: Extension = {
        id: extensionId,
        name: 'Test Extension',
        version: '1.0.0',
        description: 'Test',
        author: 'Test Author',
        manifestVersion: 2,
        permissions: [],
        icons: {},
        isEnabled: true,
        installDate: new Date()
      }
      
      extensionManager['installedExtensions'].set(extensionId, mockExtension)
      
      // Set up profile extension state
      const profileStates = new Map()
      profileStates.set(extensionId, {
        extensionId,
        profileId,
        isEnabled: true,
        settings: {},
        permissions: []
      })
      extensionManager['profileExtensionStates'].set(profileId, profileStates)
    })

    it('should disable extension for profile', async () => {
      await extensionManager.disableExtensionForProfile(profileId, extensionId)

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE profile_extension_states'),
        expect.arrayContaining([0, profileId, extensionId])
      )
    })
  })

  describe('getExtensionsForProfile', () => {
    const profileId = 'profile-1'
    const extensionId = 'test-extension-id'

    beforeEach(() => {
      const mockExtension: Extension = {
        id: extensionId,
        name: 'Test Extension',
        version: '1.0.0',
        description: 'Test',
        author: 'Test Author',
        manifestVersion: 2,
        permissions: [],
        icons: {},
        isEnabled: false,
        installDate: new Date()
      }
      
      extensionManager['installedExtensions'].set(extensionId, mockExtension)
      
      const profileStates = new Map()
      profileStates.set(extensionId, {
        extensionId,
        profileId,
        isEnabled: true,
        settings: {},
        permissions: []
      })
      extensionManager['profileExtensionStates'].set(profileId, profileStates)
    })

    it('should return extensions for profile with correct enabled state', async () => {
      const extensions = await extensionManager.getExtensionsForProfile(profileId)

      expect(extensions).toHaveLength(1)
      expect(extensions[0]).toMatchObject({
        id: extensionId,
        name: 'Test Extension',
        isEnabled: true // Should use profile state, not extension default
      })
    })

    it('should return empty array for profile with no extensions', async () => {
      const extensions = await extensionManager.getExtensionsForProfile('empty-profile')

      expect(extensions).toHaveLength(0)
    })
  })

  describe('profile isolation', () => {
    const extensionId = 'test-extension-id'
    const profile1Id = 'profile-1'
    const profile2Id = 'profile-2'

    beforeEach(() => {
      const mockExtension: Extension = {
        id: extensionId,
        name: 'Test Extension',
        version: '1.0.0',
        description: 'Test',
        author: 'Test Author',
        manifestVersion: 2,
        permissions: [],
        icons: {},
        isEnabled: false,
        installDate: new Date()
      }
      
      extensionManager['installedExtensions'].set(extensionId, mockExtension)
      
      // Set up profile extension states for both profiles
      const profile1States = new Map()
      profile1States.set(extensionId, {
        extensionId,
        profileId: profile1Id,
        isEnabled: false,
        settings: { profile1Setting: 'value1' },
        permissions: []
      })
      extensionManager['profileExtensionStates'].set(profile1Id, profile1States)
      
      const profile2States = new Map()
      profile2States.set(extensionId, {
        extensionId,
        profileId: profile2Id,
        isEnabled: true,
        settings: { profile2Setting: 'value2' },
        permissions: []
      })
      extensionManager['profileExtensionStates'].set(profile2Id, profile2States)
    })

    it('should maintain separate extension states for different profiles', async () => {
      // Enable for profile 1
      await extensionManager.enableExtensionForProfile(profile1Id, extensionId)
      
      // Disable for profile 2
      await extensionManager.disableExtensionForProfile(profile2Id, extensionId)

      const profile1Extensions = await extensionManager.getExtensionsForProfile(profile1Id)
      const profile2Extensions = await extensionManager.getExtensionsForProfile(profile2Id)

      // Should have different enabled states
      expect(profile1Extensions[0]?.isEnabled).toBe(true)
      expect(profile2Extensions[0]?.isEnabled).toBe(false)
    })

    it('should isolate extension settings between profiles', async () => {
      const state1 = await extensionManager.getExtensionState(profile1Id, extensionId)
      const state2 = await extensionManager.getExtensionState(profile2Id, extensionId)

      // States should be independent
      expect(state1).not.toBe(state2)
      expect(state1?.settings).toEqual({ profile1Setting: 'value1' })
      expect(state2?.settings).toEqual({ profile2Setting: 'value2' })
    })
  })
})