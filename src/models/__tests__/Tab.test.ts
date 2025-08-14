import { describe, it, expect, beforeEach } from 'vitest'
import { Tab } from '../Tab'

describe('Tab', () => {
  let validTabData: {
    profileId: string
    url: string
    title: string
  }

  beforeEach(() => {
    validTabData = {
      profileId: 'test-profile-id',
      url: 'https://example.com',
      title: 'Example Site'
    }
  })

  describe('constructor', () => {
    it('should create a valid tab with required fields', () => {
      const tab = new Tab(validTabData.profileId)

      expect(tab.id).toBeDefined()
      expect(tab.profileId).toBe(validTabData.profileId)
      expect(tab.url).toBe('about:blank')
      expect(tab.title).toBe('New Tab')
      expect(tab.isActive).toBe(false)
      expect(tab.isLoading).toBe(false)
      expect(tab.favicon).toBeUndefined()
    })

    it('should create a tab with custom URL and title', () => {
      const tab = new Tab(
        validTabData.profileId,
        validTabData.url,
        validTabData.title
      )

      expect(tab.url).toBe(validTabData.url)
      expect(tab.title).toBe(validTabData.title)
    })

    it('should create a tab with custom ID', () => {
      const customId = 'custom-tab-id'
      const tab = new Tab(
        validTabData.profileId,
        validTabData.url,
        validTabData.title,
        customId
      )

      expect(tab.id).toBe(customId)
    })
  })

  describe('validation', () => {
    it('should throw error for empty profile ID', () => {
      expect(() => {
        new Tab('')
      }).toThrow('Tab profile ID cannot be empty')
    })

    it('should throw error for whitespace-only profile ID', () => {
      expect(() => {
        new Tab('   ')
      }).toThrow('Tab profile ID cannot be empty')
    })

    it('should throw error for empty URL', () => {
      expect(() => {
        new Tab(validTabData.profileId, '')
      }).toThrow('Tab URL cannot be empty')
    })

    it('should throw error for title exceeding 200 characters', () => {
      const longTitle = 'a'.repeat(201)
      expect(() => {
        new Tab(validTabData.profileId, validTabData.url, longTitle)
      }).toThrow('Tab title cannot exceed 200 characters')
    })

    it('should throw error for invalid URL', () => {
      expect(() => {
        new Tab(validTabData.profileId, 'invalid-url')
      }).toThrow('Tab URL is not valid')
    })

    it('should allow special browser URLs', () => {
      const specialUrls = [
        'about:blank',
        'about:newtab',
        'chrome://settings',
        'moz-extension://extension-id/page.html'
      ]

      specialUrls.forEach(url => {
        expect(() => {
          new Tab(validTabData.profileId, url)
        }).not.toThrow()
      })
    })

    it('should allow valid HTTP/HTTPS URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://subdomain.example.com/path?query=value#fragment',
        'https://localhost:3000'
      ]

      validUrls.forEach(url => {
        expect(() => {
          new Tab(validTabData.profileId, url)
        }).not.toThrow()
      })
    })
  })

  describe('updateUrl', () => {
    it('should update URL with validation', () => {
      const tab = new Tab(validTabData.profileId)
      const newUrl = 'https://newsite.com'

      tab.updateUrl(newUrl)

      expect(tab.url).toBe(newUrl)
      expect(tab.isLoading).toBe(true)
    })

    it('should throw error for invalid URL update', () => {
      const tab = new Tab(validTabData.profileId)

      expect(() => {
        tab.updateUrl('invalid-url')
      }).toThrow('Invalid URL provided')
    })
  })

  describe('updateTitle', () => {
    it('should update title successfully', () => {
      const tab = new Tab(validTabData.profileId)
      const newTitle = 'New Title'

      tab.updateTitle(newTitle)

      expect(tab.title).toBe(newTitle)
    })

    it('should throw error for title exceeding 200 characters', () => {
      const tab = new Tab(validTabData.profileId)
      const longTitle = 'a'.repeat(201)

      expect(() => {
        tab.updateTitle(longTitle)
      }).toThrow('Tab title cannot exceed 200 characters')
    })
  })

  describe('setFavicon', () => {
    it('should set favicon with valid URL', () => {
      const tab = new Tab(validTabData.profileId)
      const faviconUrl = 'https://example.com/favicon.ico'

      tab.setFavicon(faviconUrl)

      expect(tab.favicon).toBe(faviconUrl)
    })

    it('should throw error for invalid favicon URL', () => {
      const tab = new Tab(validTabData.profileId)

      expect(() => {
        tab.setFavicon('invalid-url')
      }).toThrow('Invalid favicon URL provided')
    })

    it('should allow empty favicon URL', () => {
      const tab = new Tab(validTabData.profileId)

      expect(() => {
        tab.setFavicon('')
      }).not.toThrow()
    })
  })

  describe('state management', () => {
    let tab: Tab

    beforeEach(() => {
      tab = new Tab(validTabData.profileId, validTabData.url, validTabData.title)
    })

    it('should set loading state', () => {
      tab.setLoading(true)
      expect(tab.isLoading).toBe(true)

      tab.setLoading(false)
      expect(tab.isLoading).toBe(false)
    })

    it('should set active state', () => {
      tab.setActive(true)
      expect(tab.isActive).toBe(true)

      tab.setActive(false)
      expect(tab.isActive).toBe(false)
    })
  })

  describe('serialization', () => {
    it('should convert to JSON correctly', () => {
      const tab = new Tab(
        validTabData.profileId,
        validTabData.url,
        validTabData.title
      )
      tab.setFavicon('https://example.com/favicon.ico')
      tab.setActive(true)
      tab.setLoading(true)

      const json = tab.toJSON()

      expect(json.id).toBe(tab.id)
      expect(json.profileId).toBe(tab.profileId)
      expect(json.url).toBe(tab.url)
      expect(json.title).toBe(tab.title)
      expect(json.favicon).toBe(tab.favicon)
      expect(json.isActive).toBe(tab.isActive)
      expect(json.isLoading).toBe(tab.isLoading)
    })

    it('should create from JSON correctly', () => {
      const originalTab = new Tab(
        validTabData.profileId,
        validTabData.url,
        validTabData.title
      )
      originalTab.setFavicon('https://example.com/favicon.ico')
      originalTab.setActive(true)
      originalTab.setLoading(true)

      const json = originalTab.toJSON()
      const restoredTab = Tab.fromJSON(json)

      expect(restoredTab.id).toBe(originalTab.id)
      expect(restoredTab.profileId).toBe(originalTab.profileId)
      expect(restoredTab.url).toBe(originalTab.url)
      expect(restoredTab.title).toBe(originalTab.title)
      expect(restoredTab.favicon).toBe(originalTab.favicon)
      expect(restoredTab.isActive).toBe(originalTab.isActive)
      expect(restoredTab.isLoading).toBe(originalTab.isLoading)
    })
  })

  describe('static validation methods', () => {
    it('should validate URLs correctly', () => {
      // Valid URLs
      expect(Tab.isValidUrl('https://example.com')).toBe(true)
      expect(Tab.isValidUrl('http://example.com')).toBe(true)
      expect(Tab.isValidUrl('about:blank')).toBe(true)
      expect(Tab.isValidUrl('chrome://settings')).toBe(true)
      expect(Tab.isValidUrl('moz-extension://id/page.html')).toBe(true)

      // Invalid URLs
      expect(Tab.isValidUrl('invalid-url')).toBe(false)
      expect(Tab.isValidUrl('just-text')).toBe(false)
      expect(Tab.isValidUrl('')).toBe(false)
    })
  })
})