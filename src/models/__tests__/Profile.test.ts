import { describe, it, expect, beforeEach } from 'vitest'
import { Profile } from '../Profile'
import { Tab } from '../Tab'
import { ProfileSettings } from '../../types'

describe('Profile', () => {
  let validProfileData: {
    name: string
    icon: string
    settings?: Partial<ProfileSettings>
  }

  beforeEach(() => {
    validProfileData = {
      name: 'Test Profile',
      icon: '👤',
      settings: {
        antiFingerprinting: true,
        performanceMode: 'standard',
        autoRotateUserAgent: false
      }
    }
  })

  describe('constructor', () => {
    it('should create a valid profile with required fields', () => {
      const profile = new Profile(validProfileData.name, validProfileData.icon)

      expect(profile.id).toBeDefined()
      expect(profile.name).toBe(validProfileData.name)
      expect(profile.icon).toBe(validProfileData.icon)
      expect(profile.createdAt).toBeInstanceOf(Date)
      expect(profile.lastUsed).toBeInstanceOf(Date)
      expect(profile.dataPath).toContain(profile.id)
      expect(profile.settings).toBeDefined()
      expect(profile.tabs).toEqual([])
    })

    it('should create a profile with custom settings', () => {
      const profile = new Profile(
        validProfileData.name,
        validProfileData.icon,
        validProfileData.settings
      )

      expect(profile.settings.antiFingerprinting).toBe(true)
      expect(profile.settings.performanceMode).toBe('standard')
      expect(profile.settings.autoRotateUserAgent).toBe(false)
    })

    it('should create a profile with custom ID', () => {
      const customId = 'custom-profile-id'
      const profile = new Profile(
        validProfileData.name,
        validProfileData.icon,
        undefined,
        customId
      )

      expect(profile.id).toBe(customId)
    })

    it('should apply default settings when none provided', () => {
      const profile = new Profile(validProfileData.name, validProfileData.icon)

      expect(profile.settings.antiFingerprinting).toBe(false)
      expect(profile.settings.performanceMode).toBe('standard')
      expect(profile.settings.autoRotateUserAgent).toBe(false)
    })
  })

  describe('validation', () => {
    it('should throw error for empty name', () => {
      expect(() => {
        new Profile('', validProfileData.icon)
      }).toThrow('Profile name cannot be empty')
    })

    it('should throw error for whitespace-only name', () => {
      expect(() => {
        new Profile('   ', validProfileData.icon)
      }).toThrow('Profile name cannot be empty')
    })

    it('should throw error for name exceeding 50 characters', () => {
      const longName = 'a'.repeat(51)
      expect(() => {
        new Profile(longName, validProfileData.icon)
      }).toThrow('Profile name cannot exceed 50 characters')
    })

    it('should throw error for name with invalid characters', () => {
      expect(() => {
        new Profile('Test@Profile!', validProfileData.icon)
      }).toThrow('Profile name contains invalid characters')
    })

    it('should allow valid characters in name', () => {
      const validNames = [
        'Test Profile',
        'Test-Profile',
        'Test_Profile',
        'TestProfile123',
        'Test Profile 123'
      ]

      validNames.forEach(name => {
        expect(() => {
          new Profile(name, validProfileData.icon)
        }).not.toThrow()
      })
    })

    it('should throw error for empty icon', () => {
      expect(() => {
        new Profile(validProfileData.name, '')
      }).toThrow('Profile icon cannot be empty')
    })

    it('should throw error for invalid performance mode', () => {
      expect(() => {
        new Profile(validProfileData.name, validProfileData.icon, {
          performanceMode: 'invalid' as any
        })
      }).toThrow('Performance mode must be either "standard" or "extreme"')
    })

    it('should throw error for invalid memory limit', () => {
      expect(() => {
        new Profile(validProfileData.name, validProfileData.icon, {
          memoryLimit: 100 // Below minimum
        })
      }).toThrow('Memory limit must be between 128MB and 8192MB')

      expect(() => {
        new Profile(validProfileData.name, validProfileData.icon, {
          memoryLimit: 10000 // Above maximum
        })
      }).toThrow('Memory limit must be between 128MB and 8192MB')
    })

    it('should throw error for user agent exceeding 500 characters', () => {
      const longUserAgent = 'a'.repeat(501)
      expect(() => {
        new Profile(validProfileData.name, validProfileData.icon, {
          userAgent: longUserAgent
        })
      }).toThrow('User agent string cannot exceed 500 characters')
    })

    it('should throw error for non-boolean antiFingerprinting', () => {
      expect(() => {
        new Profile(validProfileData.name, validProfileData.icon, {
          antiFingerprinting: 'true' as any
        })
      }).toThrow('Anti-fingerprinting setting must be a boolean')
    })

    it('should throw error for non-boolean autoRotateUserAgent', () => {
      expect(() => {
        new Profile(validProfileData.name, validProfileData.icon, {
          autoRotateUserAgent: 'false' as any
        })
      }).toThrow('Auto rotate user agent setting must be a boolean')
    })
  })

  describe('updateLastUsed', () => {
    it('should update the lastUsed timestamp', () => {
      const profile = new Profile(validProfileData.name, validProfileData.icon)
      const originalTime = profile.lastUsed

      // Wait a bit to ensure different timestamp
      setTimeout(() => {
        profile.updateLastUsed()
        expect(profile.lastUsed.getTime()).toBeGreaterThan(originalTime.getTime())
      }, 10)
    })
  })

  describe('updateSettings', () => {
    it('should update settings with validation', () => {
      const profile = new Profile(validProfileData.name, validProfileData.icon)
      
      profile.updateSettings({
        antiFingerprinting: true,
        memoryLimit: 512
      })

      expect(profile.settings.antiFingerprinting).toBe(true)
      expect(profile.settings.memoryLimit).toBe(512)
    })

    it('should throw error for invalid settings update', () => {
      const profile = new Profile(validProfileData.name, validProfileData.icon)

      expect(() => {
        profile.updateSettings({
          memoryLimit: 50 // Invalid
        })
      }).toThrow('Memory limit must be between 128MB and 8192MB')
    })
  })

  describe('tab management', () => {
    let profile: Profile
    let tab: Tab

    beforeEach(() => {
      profile = new Profile(validProfileData.name, validProfileData.icon)
      tab = new Tab(profile.id, 'https://example.com', 'Example')
    })

    it('should add a tab to the profile', () => {
      profile.addTab(tab)
      expect(profile.tabs).toHaveLength(1)
      expect(profile.tabs[0]).toBe(tab)
    })

    it('should throw error when adding tab with wrong profile ID', () => {
      const wrongTab = new Tab('wrong-profile-id', 'https://example.com')
      
      expect(() => {
        profile.addTab(wrongTab)
      }).toThrow('Tab profile ID does not match this profile')
    })

    it('should remove a tab from the profile', () => {
      profile.addTab(tab)
      profile.removeTab(tab.id)
      expect(profile.tabs).toHaveLength(0)
    })

    it('should get the active tab', () => {
      tab.setActive(true)
      profile.addTab(tab)
      
      const activeTab = profile.getActiveTab()
      expect(activeTab).toBe(tab)
    })

    it('should return undefined when no active tab', () => {
      profile.addTab(tab)
      
      const activeTab = profile.getActiveTab()
      expect(activeTab).toBeUndefined()
    })

    it('should set a tab as active', () => {
      const tab2 = new Tab(profile.id, 'https://example2.com')
      tab.setActive(true)
      tab2.setActive(true)
      
      profile.addTab(tab)
      profile.addTab(tab2)
      
      profile.setActiveTab(tab.id)
      
      expect(tab.isActive).toBe(true)
      expect(tab2.isActive).toBe(false)
    })
  })

  describe('serialization', () => {
    it('should convert to JSON correctly', () => {
      const profile = new Profile(validProfileData.name, validProfileData.icon)
      const json = profile.toJSON()

      expect(json.id).toBe(profile.id)
      expect(json.name).toBe(profile.name)
      expect(json.icon).toBe(profile.icon)
      expect(json.createdAt).toBe(profile.createdAt)
      expect(json.lastUsed).toBe(profile.lastUsed)
      expect(json.dataPath).toBe(profile.dataPath)
      expect(json.settings).toEqual(profile.settings)
      expect(json.tabs).toEqual(profile.tabs)
    })

    it('should create from JSON correctly', () => {
      const originalProfile = new Profile(validProfileData.name, validProfileData.icon)
      const json = originalProfile.toJSON()
      const restoredProfile = Profile.fromJSON(json)

      expect(restoredProfile.id).toBe(originalProfile.id)
      expect(restoredProfile.name).toBe(originalProfile.name)
      expect(restoredProfile.icon).toBe(originalProfile.icon)
      expect(restoredProfile.lastUsed).toEqual(originalProfile.lastUsed)
      expect(restoredProfile.settings).toEqual(originalProfile.settings)
    })
  })

  describe('static validation methods', () => {
    it('should validate profile names correctly', () => {
      expect(Profile.isValidName('Valid Name')).toBe(true)
      expect(Profile.isValidName('Valid-Name')).toBe(true)
      expect(Profile.isValidName('Valid_Name')).toBe(true)
      expect(Profile.isValidName('ValidName123')).toBe(true)
      
      expect(Profile.isValidName('')).toBe(false)
      expect(Profile.isValidName('   ')).toBe(false)
      expect(Profile.isValidName('a'.repeat(51))).toBe(false)
      expect(Profile.isValidName('Invalid@Name')).toBe(false)
    })

    it('should validate user agent strings correctly', () => {
      expect(Profile.isValidUserAgent('')).toBe(true) // Optional field
      expect(Profile.isValidUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(true)
      expect(Profile.isValidUserAgent('a'.repeat(500))).toBe(true)
      expect(Profile.isValidUserAgent('a'.repeat(501))).toBe(false)
    })
  })
})