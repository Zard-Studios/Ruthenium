import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UserAgentManager, UserAgentPreset } from '../UserAgentManager'

describe('UserAgentManager', () => {
  let userAgentManager: UserAgentManager

  beforeEach(() => {
    userAgentManager = new UserAgentManager()
  })

  afterEach(() => {
    userAgentManager.stopRotation()
  })

  describe('getAllPresets', () => {
    it('should return all preset user agents', () => {
      const presets = userAgentManager.getAllPresets()
      
      expect(presets.length).toBeGreaterThan(0)
      expect(presets[0]).toHaveProperty('id')
      expect(presets[0]).toHaveProperty('name')
      expect(presets[0]).toHaveProperty('userAgent')
      expect(presets[0]).toHaveProperty('category')
      expect(presets[0]).toHaveProperty('platform')
      expect(presets[0]).toHaveProperty('browser')
      expect(presets[0]).toHaveProperty('version')
    })

    it('should include custom presets', () => {
      const customPreset = userAgentManager.addCustomPreset({
        name: 'Test Browser',
        userAgent: 'Mozilla/5.0 (Test) TestBrowser/1.0',
        category: 'desktop',
        platform: 'Test',
        browser: 'TestBrowser',
        version: '1.0'
      })

      const allPresets = userAgentManager.getAllPresets()
      expect(allPresets).toContain(customPreset)
    })
  })

  describe('getPresetsByCategory', () => {
    it('should return presets filtered by category', () => {
      const desktopPresets = userAgentManager.getPresetsByCategory('desktop')
      const mobilePresets = userAgentManager.getPresetsByCategory('mobile')

      expect(desktopPresets.length).toBeGreaterThan(0)
      expect(mobilePresets.length).toBeGreaterThan(0)
      
      desktopPresets.forEach(preset => {
        expect(preset.category).toBe('desktop')
      })
      
      mobilePresets.forEach(preset => {
        expect(preset.category).toBe('mobile')
      })
    })

    it('should return empty array for non-existent category', () => {
      const presets = userAgentManager.getPresetsByCategory('nonexistent' as any)
      expect(presets).toEqual([])
    })
  })

  describe('getPresetById', () => {
    it('should return preset by ID', () => {
      const preset = userAgentManager.getPresetById('chrome-windows-latest')
      
      expect(preset).toBeDefined()
      expect(preset?.id).toBe('chrome-windows-latest')
      expect(preset?.browser).toBe('Chrome')
      expect(preset?.platform).toBe('Windows')
    })

    it('should return undefined for non-existent ID', () => {
      const preset = userAgentManager.getPresetById('non-existent-id')
      expect(preset).toBeUndefined()
    })
  })

  describe('addCustomPreset', () => {
    it('should add a custom preset', () => {
      const customPreset = userAgentManager.addCustomPreset({
        name: 'Custom Browser',
        userAgent: 'Mozilla/5.0 (Custom) CustomBrowser/2.0',
        category: 'desktop',
        platform: 'Custom',
        browser: 'CustomBrowser',
        version: '2.0'
      })

      expect(customPreset.id).toBeDefined()
      expect(customPreset.category).toBe('custom')
      expect(customPreset.name).toBe('Custom Browser')

      const foundPreset = userAgentManager.getPresetById(customPreset.id)
      expect(foundPreset).toEqual(customPreset)
    })
  })

  describe('removeCustomPreset', () => {
    it('should remove a custom preset', () => {
      const customPreset = userAgentManager.addCustomPreset({
        name: 'To Remove',
        userAgent: 'Mozilla/5.0 (ToRemove) RemoveBrowser/1.0',
        category: 'desktop',
        platform: 'Remove',
        browser: 'RemoveBrowser',
        version: '1.0'
      })

      const removed = userAgentManager.removeCustomPreset(customPreset.id)
      expect(removed).toBe(true)

      const foundPreset = userAgentManager.getPresetById(customPreset.id)
      expect(foundPreset).toBeUndefined()
    })

    it('should return false for non-existent preset', () => {
      const removed = userAgentManager.removeCustomPreset('non-existent-id')
      expect(removed).toBe(false)
    })
  })

  describe('getRandomUserAgent', () => {
    it('should return a random user agent', () => {
      const randomPreset = userAgentManager.getRandomUserAgent()
      
      expect(randomPreset).toBeDefined()
      expect(randomPreset.userAgent).toBeDefined()
      expect(randomPreset.category).toBeDefined()
    })

    it('should return a random user agent from specific category', () => {
      const randomDesktop = userAgentManager.getRandomUserAgent('desktop')
      const randomMobile = userAgentManager.getRandomUserAgent('mobile')

      expect(randomDesktop.category).toBe('desktop')
      expect(randomMobile.category).toBe('mobile')
    })

    it('should return fallback for empty category', () => {
      const randomPreset = userAgentManager.getRandomUserAgent('nonexistent' as any)
      expect(randomPreset).toBeDefined()
    })
  })

  describe('rotation', () => {
    it('should start and stop rotation', () => {
      expect(userAgentManager.isRotationEnabled()).toBe(false)

      userAgentManager.startRotation(1000)
      expect(userAgentManager.isRotationEnabled()).toBe(true)

      userAgentManager.stopRotation()
      expect(userAgentManager.isRotationEnabled()).toBe(false)
    })

    it('should call rotation handler when rotating', (done) => {
      let rotationCalled = false
      
      userAgentManager.onRotation = (userAgent: UserAgentPreset) => {
        rotationCalled = true
        expect(userAgent).toBeDefined()
        expect(userAgent.userAgent).toBeDefined()
        userAgentManager.stopRotation()
        done()
      }

      userAgentManager.startRotation(100) // Very short interval for testing
    })

    it('should get next rotation user agent', () => {
      userAgentManager.startRotation(1000)
      
      const nextUserAgent = userAgentManager.getNextRotationUserAgent()
      expect(nextUserAgent).toBeDefined()
      expect(nextUserAgent?.userAgent).toBeDefined()

      userAgentManager.stopRotation()
    })

    it('should return null when rotation is disabled', () => {
      const nextUserAgent = userAgentManager.getNextRotationUserAgent()
      expect(nextUserAgent).toBeNull()
    })
  })

  describe('parseUserAgent', () => {
    it('should parse Chrome user agent', () => {
      const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      const parsed = userAgentManager.parseUserAgent(chromeUA)

      expect(parsed.browser).toBe('Chrome')
      expect(parsed.platform).toBe('Windows')
      expect(parsed.category).toBe('desktop')
      expect(parsed.version).toBe('120.0.0.0')
    })

    it('should parse Firefox user agent', () => {
      const firefoxUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
      const parsed = userAgentManager.parseUserAgent(firefoxUA)

      expect(parsed.browser).toBe('Firefox')
      expect(parsed.platform).toBe('Windows')
      expect(parsed.category).toBe('desktop')
      expect(parsed.version).toBe('121.0')
    })

    it('should parse Safari user agent', () => {
      const safariUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
      const parsed = userAgentManager.parseUserAgent(safariUA)

      expect(parsed.browser).toBe('Safari')
      expect(parsed.platform).toBe('macOS')
      expect(parsed.category).toBe('desktop')
      expect(parsed.version).toBe('17.1')
    })

    it('should parse mobile user agent', () => {
      const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
      const parsed = userAgentManager.parseUserAgent(mobileUA)

      expect(parsed.platform).toBe('iOS')
      expect(parsed.category).toBe('mobile')
    })

    it('should parse bot user agent', () => {
      const botUA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      const parsed = userAgentManager.parseUserAgent(botUA)

      expect(parsed.category).toBe('bot')
      expect(parsed.platform).toBe('Bot')
    })
  })

  describe('validateUserAgent', () => {
    it('should validate correct user agents', () => {
      const validUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      expect(userAgentManager.validateUserAgent(validUA)).toBe(true)
    })

    it('should reject invalid user agents', () => {
      expect(userAgentManager.validateUserAgent('invalid')).toBe(false)
      expect(userAgentManager.validateUserAgent('')).toBe(false)
      expect(userAgentManager.validateUserAgent('short')).toBe(false)
    })
  })

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      // Add a custom preset
      userAgentManager.addCustomPreset({
        name: 'Test',
        userAgent: 'Mozilla/5.0 (Test) TestBrowser/1.0',
        category: 'desktop',
        platform: 'Test',
        browser: 'TestBrowser',
        version: '1.0'
      })

      userAgentManager.startRotation(1000)

      const stats = userAgentManager.getStatistics()

      expect(stats.totalPresets).toBeGreaterThan(0)
      expect(stats.customPresets).toBe(1)
      expect(stats.rotationEnabled).toBe(true)
      expect(stats.presetsByCategory).toHaveProperty('desktop')
      expect(stats.presetsByCategory).toHaveProperty('mobile')
      expect(stats.presetsByCategory).toHaveProperty('custom')

      userAgentManager.stopRotation()
    })
  })
})