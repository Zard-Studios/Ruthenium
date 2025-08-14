import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BrowserEngine } from '../BrowserEngine'
import { Profile, ProfileSettings } from '../../types'

// Mock Electron modules
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  webContents: {
    create: vi.fn(() => ({
      loadURL: vi.fn(),
      destroy: vi.fn(),
      isDestroyed: vi.fn(() => false),
      setUserAgent: vi.fn(),
      on: vi.fn(),
      removeAllListeners: vi.fn()
    }))
  },
  session: {
    fromPartition: vi.fn(() => ({
      setUserAgent: vi.fn(),
      setPermissionRequestHandler: vi.fn(),
      setSpellCheckerDictionaryDownloadURL: vi.fn(),
      setPreloads: vi.fn(),
      setCertificateVerifyProc: vi.fn(),
      clearCache: vi.fn(),
      clearStorageData: vi.fn(),
      on: vi.fn(),
      webRequest: {
        onBeforeSendHeaders: vi.fn(),
        onHeadersReceived: vi.fn(),
        onBeforeRequest: vi.fn()
      }
    }))
  }
}))

vi.mock('uuid', () => {
  let counter = 0
  return {
    v4: vi.fn(() => `test-uuid-${++counter}`)
  }
})

vi.mock('../ProfileDataManager', () => ({
  ProfileDataManager: {
    createProfileDirectories: vi.fn(() => Promise.resolve({
      root: '/test/profile/root',
      cache: '/test/profile/cache',
      cookies: '/test/profile/cookies',
      localStorage: '/test/profile/localStorage',
      sessionStorage: '/test/profile/sessionStorage',
      downloads: '/test/profile/downloads',
      extensions: '/test/profile/extensions',
      logs: '/test/profile/logs'
    })),
    clearProfileData: vi.fn(() => Promise.resolve()),
    getProfileDataSize: vi.fn(() => Promise.resolve(1024)),
    verifyDataIsolation: vi.fn((id1, id2) => Promise.resolve(id1 !== id2))
  }
}))

vi.mock('../UserAgentManager', () => ({
  UserAgentManager: vi.fn().mockImplementation(() => ({
    getAllPresets: vi.fn(() => [
      {
        id: 'chrome-windows-latest',
        name: 'Chrome (Windows)',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        category: 'desktop',
        platform: 'Windows',
        browser: 'Chrome',
        version: '120.0.0.0'
      }
    ]),
    getPresetsByCategory: vi.fn(() => []),
    getPresetById: vi.fn(() => ({
      id: 'chrome-windows-latest',
      name: 'Chrome (Windows)',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      category: 'desktop',
      platform: 'Windows',
      browser: 'Chrome',
      version: '120.0.0.0'
    })),
    addCustomPreset: vi.fn(() => ({ id: 'custom-123', name: 'Custom' })),
    removeCustomPreset: vi.fn(() => true),
    getRandomUserAgent: vi.fn(() => ({
      id: 'random-ua',
      name: 'Random UA',
      userAgent: 'Mozilla/5.0 (Random) RandomBrowser/1.0',
      category: 'desktop',
      platform: 'Random',
      browser: 'RandomBrowser',
      version: '1.0'
    })),
    startRotation: vi.fn(),
    stopRotation: vi.fn(),
    isRotationEnabled: vi.fn(() => false),
    validateUserAgent: vi.fn(() => true),
    parseUserAgent: vi.fn(() => ({ browser: 'Chrome', platform: 'Windows' })),
    getStatistics: vi.fn(() => ({
      totalPresets: 10,
      presetsByCategory: { desktop: 5, mobile: 3, tablet: 2 },
      customPresets: 0,
      rotationEnabled: false
    })),
    onRotation: undefined
  }))
}))

describe('BrowserEngine', () => {
  let browserEngine: BrowserEngine
  let mockProfile: Profile

  beforeEach(() => {
    browserEngine = new BrowserEngine()
    
    const mockSettings: ProfileSettings = {
      antiFingerprinting: false,
      performanceMode: 'standard',
      autoRotateUserAgent: false
    }

    mockProfile = {
      id: 'test-profile-1',
      name: 'Test Profile',
      icon: '🧪',
      createdAt: new Date(),
      lastUsed: new Date(),
      dataPath: '/test/path',
      settings: mockSettings,
      tabs: []
    }
  })

  afterEach(async () => {
    await browserEngine.cleanup()
  })

  describe('initializeProfile', () => {
    it('should initialize a profile successfully', async () => {
      await expect(browserEngine.initializeProfile(mockProfile)).resolves.not.toThrow()
    })

    it('should not reinitialize an already initialized profile', async () => {
      await browserEngine.initializeProfile(mockProfile)
      await expect(browserEngine.initializeProfile(mockProfile)).resolves.not.toThrow()
    })

    it('should configure anti-fingerprinting when enabled', async () => {
      const profileWithAntiFingerprinting = {
        ...mockProfile,
        settings: {
          ...mockProfile.settings,
          antiFingerprinting: true
        }
      }

      await expect(browserEngine.initializeProfile(profileWithAntiFingerprinting)).resolves.not.toThrow()
    })
  })

  describe('createTab', () => {
    beforeEach(async () => {
      await browserEngine.initializeProfile(mockProfile)
    })

    it('should create a new tab successfully', async () => {
      const tab = await browserEngine.createTab(mockProfile.id)
      
      expect(tab).toMatchObject({
        id: expect.any(String),
        profileId: mockProfile.id,
        url: 'about:blank',
        title: 'New Tab',
        isActive: false,
        isLoading: false
      })
    })

    it('should create a tab with a specific URL', async () => {
      const testUrl = 'https://example.com'
      const tab = await browserEngine.createTab(mockProfile.id, testUrl)
      
      expect(tab.url).toBe(testUrl)
    })

    it('should throw error for uninitialized profile', async () => {
      await expect(browserEngine.createTab('non-existent-profile')).rejects.toThrow(
        'Profile non-existent-profile not initialized'
      )
    })
  })

  describe('closeTab', () => {
    let tabId: string

    beforeEach(async () => {
      await browserEngine.initializeProfile(mockProfile)
      const tab = await browserEngine.createTab(mockProfile.id)
      tabId = tab.id
    })

    it('should close a tab successfully', async () => {
      await expect(browserEngine.closeTab(tabId)).resolves.not.toThrow()
    })

    it('should throw error for non-existent tab', async () => {
      await expect(browserEngine.closeTab('non-existent-tab')).rejects.toThrow(
        'Tab non-existent-tab not found'
      )
    })
  })

  describe('navigateTab', () => {
    let tabId: string

    beforeEach(async () => {
      await browserEngine.initializeProfile(mockProfile)
      const tab = await browserEngine.createTab(mockProfile.id)
      tabId = tab.id
    })

    it('should navigate tab to a new URL', async () => {
      const testUrl = 'https://example.com'
      await expect(browserEngine.navigateTab(tabId, testUrl)).resolves.not.toThrow()
    })

    it('should throw error for non-existent tab', async () => {
      await expect(browserEngine.navigateTab('non-existent-tab', 'https://example.com')).rejects.toThrow(
        'Tab non-existent-tab not found'
      )
    })
  })

  describe('getProfileTabs', () => {
    beforeEach(async () => {
      await browserEngine.initializeProfile(mockProfile)
    })

    it('should return empty array for profile with no tabs', () => {
      const tabs = browserEngine.getProfileTabs(mockProfile.id)
      expect(tabs).toEqual([])
    })

    it('should return tabs for profile', async () => {
      await browserEngine.createTab(mockProfile.id, 'https://example.com')
      await browserEngine.createTab(mockProfile.id, 'https://test.com')
      
      const tabs = browserEngine.getProfileTabs(mockProfile.id)
      expect(tabs).toHaveLength(2)
      expect(tabs[0].profileId).toBe(mockProfile.id)
      expect(tabs[1].profileId).toBe(mockProfile.id)
    })

    it('should return empty array for non-existent profile', () => {
      const tabs = browserEngine.getProfileTabs('non-existent-profile')
      expect(tabs).toEqual([])
    })
  })

  describe('applyUserAgent', () => {
    beforeEach(async () => {
      await browserEngine.initializeProfile(mockProfile)
    })

    it('should apply user agent to profile', async () => {
      const userAgent = 'Mozilla/5.0 (Test Browser)'
      await expect(browserEngine.applyUserAgent(mockProfile.id, userAgent)).resolves.not.toThrow()
    })

    it('should throw error for non-existent profile', async () => {
      await expect(browserEngine.applyUserAgent('non-existent-profile', 'test-agent')).rejects.toThrow(
        'Profile non-existent-profile not initialized'
      )
    })

    it('should apply user agent to existing tabs', async () => {
      // Create a tab first
      await browserEngine.createTab(mockProfile.id, 'https://example.com')
      
      const userAgent = 'Mozilla/5.0 (Test Browser)'
      await expect(browserEngine.applyUserAgent(mockProfile.id, userAgent)).resolves.not.toThrow()
    })
  })

  describe('process isolation', () => {
    it('should create separate sessions for different profiles', async () => {
      const profile2: Profile = {
        ...mockProfile,
        id: 'test-profile-2',
        name: 'Test Profile 2'
      }

      await browserEngine.initializeProfile(mockProfile)
      await browserEngine.initializeProfile(profile2)

      const session1 = browserEngine.getProfileSession(mockProfile.id)
      const session2 = browserEngine.getProfileSession(profile2.id)

      expect(session1).toBeDefined()
      expect(session2).toBeDefined()
      expect(session1?.profileId).toBe(mockProfile.id)
      expect(session2?.profileId).toBe(profile2.id)
    })

    it('should isolate tabs between profiles', async () => {
      const profile2: Profile = {
        ...mockProfile,
        id: 'test-profile-2',
        name: 'Test Profile 2'
      }

      await browserEngine.initializeProfile(mockProfile)
      await browserEngine.initializeProfile(profile2)

      await browserEngine.createTab(mockProfile.id, 'https://example.com')
      await browserEngine.createTab(profile2.id, 'https://test.com')

      const tabs1 = browserEngine.getProfileTabs(mockProfile.id)
      const tabs2 = browserEngine.getProfileTabs(profile2.id)

      expect(tabs1).toHaveLength(1)
      expect(tabs2).toHaveLength(1)
      expect(tabs1[0].profileId).toBe(mockProfile.id)
      expect(tabs2[0].profileId).toBe(profile2.id)
    })
  })

  describe('data isolation', () => {
    beforeEach(async () => {
      await browserEngine.initializeProfile(mockProfile)
    })

    it('should clear profile cache data', async () => {
      await expect(browserEngine.clearProfileData(mockProfile.id, { cache: true })).resolves.not.toThrow()
    })

    it('should clear profile cookies', async () => {
      await expect(browserEngine.clearProfileData(mockProfile.id, { cookies: true })).resolves.not.toThrow()
    })

    it('should clear multiple data types', async () => {
      await expect(browserEngine.clearProfileData(mockProfile.id, {
        cache: true,
        cookies: true,
        localStorage: true
      })).resolves.not.toThrow()
    })

    it('should get profile data size', async () => {
      const size = await browserEngine.getProfileDataSize(mockProfile.id)
      expect(typeof size).toBe('number')
      expect(size).toBeGreaterThanOrEqual(0)
    })

    it('should verify data isolation between profiles', async () => {
      const profile2: Profile = {
        ...mockProfile,
        id: 'test-profile-2',
        name: 'Test Profile 2'
      }

      await browserEngine.initializeProfile(profile2)

      const isIsolated = await browserEngine.verifyDataIsolation(mockProfile.id, profile2.id)
      expect(isIsolated).toBe(true)
    })

    it('should throw error when clearing data for non-existent profile', async () => {
      await expect(browserEngine.clearProfileData('non-existent-profile', { cache: true })).rejects.toThrow(
        'Profile non-existent-profile not initialized'
      )
    })
  })

  describe('user agent management', () => {
    beforeEach(async () => {
      await browserEngine.initializeProfile(mockProfile)
    })

    it('should get user agent presets', () => {
      const presets = browserEngine.getUserAgentPresets()
      expect(presets).toBeDefined()
      expect(Array.isArray(presets)).toBe(true)
    })

    it('should get user agent presets by category', () => {
      const desktopPresets = browserEngine.getUserAgentPresetsByCategory('desktop')
      expect(desktopPresets).toBeDefined()
      expect(Array.isArray(desktopPresets)).toBe(true)
    })

    it('should get user agent preset by ID', () => {
      const preset = browserEngine.getUserAgentPresetById('chrome-windows-latest')
      expect(preset).toBeDefined()
      expect(preset?.id).toBe('chrome-windows-latest')
    })

    it('should add custom user agent preset', () => {
      const customPreset = browserEngine.addCustomUserAgentPreset({
        name: 'Custom Browser',
        userAgent: 'Mozilla/5.0 (Custom) CustomBrowser/1.0',
        category: 'desktop',
        platform: 'Custom',
        browser: 'CustomBrowser',
        version: '1.0'
      })

      expect(customPreset).toBeDefined()
      expect(customPreset.id).toBeDefined()
    })

    it('should remove custom user agent preset', () => {
      const removed = browserEngine.removeCustomUserAgentPreset('custom-123')
      expect(removed).toBe(true)
    })

    it('should apply user agent preset', async () => {
      await expect(browserEngine.applyUserAgentPreset(mockProfile.id, 'chrome-windows-latest')).resolves.not.toThrow()
    })

    it('should apply random user agent', async () => {
      const preset = await browserEngine.applyRandomUserAgent(mockProfile.id, 'desktop')
      expect(preset).toBeDefined()
      expect(preset.userAgent).toBeDefined()
    })

    it('should start and stop user agent rotation', () => {
      expect(() => browserEngine.startUserAgentRotation(mockProfile.id, 1000, 'desktop')).not.toThrow()
      expect(() => browserEngine.stopUserAgentRotation()).not.toThrow()
    })

    it('should check if user agent rotation is enabled', () => {
      const isEnabled = browserEngine.isUserAgentRotationEnabled()
      expect(typeof isEnabled).toBe('boolean')
    })

    it('should validate user agent', () => {
      const isValid = browserEngine.validateUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
      expect(isValid).toBe(true)
    })

    it('should parse user agent', () => {
      const parsed = browserEngine.parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
      expect(parsed).toBeDefined()
      expect(parsed.browser).toBeDefined()
    })

    it('should get user agent statistics', () => {
      const stats = browserEngine.getUserAgentStatistics()
      expect(stats).toBeDefined()
      expect(stats.totalPresets).toBeDefined()
      expect(stats.presetsByCategory).toBeDefined()
    })

    it('should throw error when applying preset to non-existent profile', async () => {
      await expect(browserEngine.applyUserAgentPreset('non-existent-profile', 'chrome-windows-latest')).rejects.toThrow(
        'Profile non-existent-profile not initialized'
      )
    })

    it('should throw error when applying non-existent preset', async () => {
      // Mock getPresetById to return undefined for non-existent preset
      const mockUserAgentManager = browserEngine['userAgentManager']
      vi.mocked(mockUserAgentManager.getPresetById).mockReturnValueOnce(undefined)

      await expect(browserEngine.applyUserAgentPreset(mockProfile.id, 'non-existent-preset')).rejects.toThrow(
        'User agent preset non-existent-preset not found'
      )
    })
  })

  describe('cleanup', () => {
    it('should cleanup all resources', async () => {
      await browserEngine.initializeProfile(mockProfile)
      await browserEngine.createTab(mockProfile.id, 'https://example.com')
      
      await expect(browserEngine.cleanup()).resolves.not.toThrow()
      
      // Verify tabs are cleaned up
      const tabs = browserEngine.getProfileTabs(mockProfile.id)
      expect(tabs).toEqual([])
    })
  })
})