import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebExtensionBridge, ExtensionContext } from '../WebExtensionBridge'
import { ExtensionManager } from '../ExtensionManager'
import { BrowserEngine } from '../BrowserEngine'
import { ProfileManager } from '../ProfileManager'
import { Extension, ExtensionState } from '../../types/extension'
import { Tab } from '../../models/Tab'

describe('WebExtensionBridge', () => {
  let webExtensionBridge: WebExtensionBridge
  let mockExtensionManager: ExtensionManager
  let mockBrowserEngine: BrowserEngine
  let mockProfileManager: ProfileManager

  const mockExtension: Extension = {
    id: 'test-extension-id',
    name: 'Test Extension',
    version: '1.0.0',
    description: 'Test extension',
    author: 'Test Author',
    manifestVersion: 2,
    permissions: ['tabs', 'storage'],
    icons: { '48': 'icon48.png' },
    isEnabled: true,
    installDate: new Date()
  }

  const mockExtensionState: ExtensionState = {
    extensionId: 'test-extension-id',
    profileId: 'profile-1',
    isEnabled: true,
    settings: {
      storage_local: { key1: 'value1' },
      storage_sync: { key2: 'value2' }
    },
    permissions: ['tabs', 'storage']
  }

  const mockTabs: Tab[] = [
    {
      id: '1',
      profileId: 'profile-1',
      url: 'https://example.com',
      title: 'Example',
      favicon: '',
      isActive: true,
      isLoading: false
    },
    {
      id: '2',
      profileId: 'profile-1',
      url: 'https://test.com',
      title: 'Test',
      favicon: '',
      isActive: false,
      isLoading: false
    }
  ]

  beforeEach(() => {
    mockExtensionManager = {
      getAllExtensions: vi.fn().mockReturnValue([mockExtension]),
      getExtensionState: vi.fn().mockResolvedValue(mockExtensionState),
      updateProfileExtensionState: vi.fn().mockResolvedValue(undefined)
    } as any

    mockBrowserEngine = {
      getProfileTabs: vi.fn().mockReturnValue(mockTabs),
      createTab: vi.fn().mockResolvedValue(mockTabs[0]),
      navigateTab: vi.fn().mockResolvedValue(undefined),
      closeTab: vi.fn().mockResolvedValue(undefined)
    } as any

    mockProfileManager = {} as ProfileManager

    webExtensionBridge = new WebExtensionBridge(
      mockExtensionManager,
      mockBrowserEngine,
      mockProfileManager
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initializeExtensionForProfile', () => {
    it('should initialize extension for profile when enabled', async () => {
      await webExtensionBridge.initializeExtensionForProfile('profile-1', 'test-extension-id')

      expect(mockExtensionManager.getAllExtensions).toHaveBeenCalled()
      expect(mockExtensionManager.getExtensionState).toHaveBeenCalledWith('profile-1', 'test-extension-id')
      
      const context = webExtensionBridge.getExtensionContext('profile-1', 'test-extension-id')
      expect(context).toBeDefined()
      expect(context?.isInitialized()).toBe(true)
    })

    it('should not initialize extension when disabled', async () => {
      const disabledState = { ...mockExtensionState, isEnabled: false }
      vi.mocked(mockExtensionManager.getExtensionState).mockResolvedValue(disabledState)

      await webExtensionBridge.initializeExtensionForProfile('profile-1', 'test-extension-id')

      const context = webExtensionBridge.getExtensionContext('profile-1', 'test-extension-id')
      expect(context).toBeUndefined()
    })

    it('should not initialize extension when not found', async () => {
      vi.mocked(mockExtensionManager.getAllExtensions).mockReturnValue([])

      await webExtensionBridge.initializeExtensionForProfile('profile-1', 'test-extension-id')

      const context = webExtensionBridge.getExtensionContext('profile-1', 'test-extension-id')
      expect(context).toBeUndefined()
    })

    it('should emit extensionInitialized event', async () => {
      const eventSpy = vi.fn()
      webExtensionBridge.on('extensionInitialized', eventSpy)

      await webExtensionBridge.initializeExtensionForProfile('profile-1', 'test-extension-id')

      expect(eventSpy).toHaveBeenCalledWith({
        profileId: 'profile-1',
        extensionId: 'test-extension-id'
      })
    })
  })

  describe('deinitializeExtensionForProfile', () => {
    beforeEach(async () => {
      await webExtensionBridge.initializeExtensionForProfile('profile-1', 'test-extension-id')
    })

    it('should deinitialize extension and cleanup context', async () => {
      await webExtensionBridge.deinitializeExtensionForProfile('profile-1', 'test-extension-id')

      const context = webExtensionBridge.getExtensionContext('profile-1', 'test-extension-id')
      expect(context).toBeUndefined()
    })

    it('should emit extensionDeinitialized event', async () => {
      const eventSpy = vi.fn()
      webExtensionBridge.on('extensionDeinitialized', eventSpy)

      await webExtensionBridge.deinitializeExtensionForProfile('profile-1', 'test-extension-id')

      expect(eventSpy).toHaveBeenCalledWith({
        profileId: 'profile-1',
        extensionId: 'test-extension-id'
      })
    })
  })

  describe('WebExtension API - tabs', () => {
    let api: any

    beforeEach(async () => {
      await webExtensionBridge.initializeExtensionForProfile('profile-1', 'test-extension-id')
      const context = webExtensionBridge.getExtensionContext('profile-1', 'test-extension-id')
      api = context?.getAPI()
    })

    describe('tabs.query', () => {
      it('should return all tabs when no query info provided', async () => {
        const tabs = await api.tabs.query({})

        expect(tabs).toHaveLength(2)
        expect(tabs[0]).toMatchObject({
          id: 1,
          url: 'https://example.com',
          title: 'Example',
          active: true
        })
      })

      it('should filter tabs by active status', async () => {
        const tabs = await api.tabs.query({ active: true })

        expect(tabs).toHaveLength(1)
        expect(tabs[0].active).toBe(true)
      })

      it('should filter tabs by URL', async () => {
        const tabs = await api.tabs.query({ url: 'example.com' })

        expect(tabs).toHaveLength(1)
        expect(tabs[0].url).toContain('example.com')
      })
    })

    describe('tabs.create', () => {
      it('should create new tab', async () => {
        const tab = await api.tabs.create({ url: 'https://new-tab.com' })

        expect(mockBrowserEngine.createTab).toHaveBeenCalledWith('profile-1', 'https://new-tab.com')
        expect(tab).toMatchObject({
          id: 1,
          url: 'https://example.com'
        })
      })
    })

    describe('tabs.update', () => {
      it('should update tab URL', async () => {
        const tab = await api.tabs.update(1, { url: 'https://updated.com' })

        expect(mockBrowserEngine.navigateTab).toHaveBeenCalledWith('1', 'https://updated.com')
        expect(tab).toMatchObject({
          id: 1,
          url: 'https://updated.com'
        })
      })

      it('should throw error for non-existent tab', async () => {
        await expect(api.tabs.update(999, { url: 'https://test.com' }))
          .rejects.toThrow('Tab 999 not found')
      })
    })

    describe('tabs.remove', () => {
      it('should remove single tab', async () => {
        await api.tabs.remove(1)

        expect(mockBrowserEngine.closeTab).toHaveBeenCalledWith('1')
      })

      it('should remove multiple tabs', async () => {
        await api.tabs.remove([1, 2])

        expect(mockBrowserEngine.closeTab).toHaveBeenCalledWith('1')
        expect(mockBrowserEngine.closeTab).toHaveBeenCalledWith('2')
      })
    })
  })

  describe('WebExtension API - storage', () => {
    let api: any

    beforeEach(async () => {
      await webExtensionBridge.initializeExtensionForProfile('profile-1', 'test-extension-id')
      const context = webExtensionBridge.getExtensionContext('profile-1', 'test-extension-id')
      api = context?.getAPI()
    })

    describe('storage.local', () => {
      it('should get all storage data when no keys provided', async () => {
        const data = await api.storage.local.get()

        expect(data).toEqual({ key1: 'value1' })
      })

      it('should get specific key', async () => {
        const data = await api.storage.local.get('key1')

        expect(data).toEqual({ key1: 'value1' })
      })

      it('should get multiple keys', async () => {
        const data = await api.storage.local.get(['key1', 'nonexistent'])

        expect(data).toEqual({ key1: 'value1' })
      })

      it('should set storage data', async () => {
        await api.storage.local.set({ newKey: 'newValue' })

        expect(mockExtensionManager.updateProfileExtensionState).toHaveBeenCalledWith(
          'profile-1',
          'test-extension-id',
          {
            settings: {
              ...mockExtensionState.settings,
              storage_local: { key1: 'value1', newKey: 'newValue' }
            }
          }
        )
      })

      it('should remove storage keys', async () => {
        await api.storage.local.remove('key1')

        expect(mockExtensionManager.updateProfileExtensionState).toHaveBeenCalledWith(
          'profile-1',
          'test-extension-id',
          {
            settings: {
              ...mockExtensionState.settings,
              storage_local: {}
            }
          }
        )
      })

      it('should clear all storage data', async () => {
        await api.storage.local.clear()

        expect(mockExtensionManager.updateProfileExtensionState).toHaveBeenCalledWith(
          'profile-1',
          'test-extension-id',
          {
            settings: {
              ...mockExtensionState.settings,
              storage_local: {}
            }
          }
        )
      })
    })

    describe('storage.sync', () => {
      it('should work similarly to local storage but use sync namespace', async () => {
        const data = await api.storage.sync.get('key2')

        expect(data).toEqual({ key2: 'value2' })
      })
    })
  })

  describe('WebExtension API - runtime', () => {
    let api: any

    beforeEach(async () => {
      await webExtensionBridge.initializeExtensionForProfile('profile-1', 'test-extension-id')
      const context = webExtensionBridge.getExtensionContext('profile-1', 'test-extension-id')
      api = context?.getAPI()
    })

    describe('runtime.getManifest', () => {
      it('should return extension manifest', () => {
        const manifest = api.runtime.getManifest()

        expect(manifest).toMatchObject({
          manifest_version: 2,
          name: 'Test Extension',
          version: '1.0.0',
          description: 'Test extension',
          author: 'Test Author',
          permissions: ['tabs', 'storage']
        })
      })
    })

    describe('runtime.getURL', () => {
      it('should return extension URL', () => {
        const url = api.runtime.getURL('popup.html')

        expect(url).toBe('extension://test-extension-id/popup.html')
      })
    })

    describe('runtime.sendMessage', () => {
      it('should send message and return acknowledgment', async () => {
        const eventSpy = vi.fn()
        webExtensionBridge.on('extensionMessage', eventSpy)

        const result = await api.runtime.sendMessage({ type: 'test', data: 'hello' })

        expect(eventSpy).toHaveBeenCalledWith({
          profileId: 'profile-1',
          extensionId: 'test-extension-id',
          message: { type: 'test', data: 'hello' }
        })
        expect(result).toEqual({ success: true })
      })
    })
  })

  describe('profile isolation', () => {
    beforeEach(async () => {
      // Initialize extension for two different profiles
      await webExtensionBridge.initializeExtensionForProfile('profile-1', 'test-extension-id')
      await webExtensionBridge.initializeExtensionForProfile('profile-2', 'test-extension-id')
    })

    it('should maintain separate extension contexts for different profiles', () => {
      const context1 = webExtensionBridge.getExtensionContext('profile-1', 'test-extension-id')
      const context2 = webExtensionBridge.getExtensionContext('profile-2', 'test-extension-id')

      expect(context1).toBeDefined()
      expect(context2).toBeDefined()
      expect(context1).not.toBe(context2)
    })

    it('should isolate storage between profiles', async () => {
      const context1 = webExtensionBridge.getExtensionContext('profile-1', 'test-extension-id')
      const context2 = webExtensionBridge.getExtensionContext('profile-2', 'test-extension-id')

      const api1 = context1?.getAPI()
      const api2 = context2?.getAPI()

      // Set different data for each profile
      await api1.storage.local.set({ profileData: 'profile1' })
      await api2.storage.local.set({ profileData: 'profile2' })

      // Verify isolation by checking that each profile's storage calls are separate
      expect(mockExtensionManager.updateProfileExtensionState).toHaveBeenCalledWith(
        'profile-1',
        'test-extension-id',
        expect.any(Object)
      )
      expect(mockExtensionManager.updateProfileExtensionState).toHaveBeenCalledWith(
        'profile-2',
        'test-extension-id',
        expect.any(Object)
      )
    })

    it('should isolate tab operations between profiles', async () => {
      const profile2Tabs: Tab[] = [
        {
          id: '3',
          profileId: 'profile-2',
          url: 'https://profile2.com',
          title: 'Profile 2',
          favicon: '',
          isActive: true,
          isLoading: false
        }
      ]

      vi.mocked(mockBrowserEngine.getProfileTabs)
        .mockReturnValueOnce(mockTabs) // profile-1
        .mockReturnValueOnce(profile2Tabs) // profile-2

      const context1 = webExtensionBridge.getExtensionContext('profile-1', 'test-extension-id')
      const context2 = webExtensionBridge.getExtensionContext('profile-2', 'test-extension-id')

      const api1 = context1?.getAPI()
      const api2 = context2?.getAPI()

      const tabs1 = await api1.tabs.query({})
      const tabs2 = await api2.tabs.query({})

      expect(tabs1).toHaveLength(2)
      expect(tabs2).toHaveLength(1)
      expect(tabs1[0].url).toContain('example.com')
      expect(tabs2[0].url).toContain('profile2.com')
    })
  })
})

describe('ExtensionContext', () => {
  let context: ExtensionContext
  const mockExtension: Extension = {
    id: 'test-extension-id',
    name: 'Test Extension',
    version: '1.0.0',
    description: 'Test extension',
    author: 'Test Author',
    manifestVersion: 2,
    permissions: ['tabs'],
    icons: {},
    isEnabled: true,
    installDate: new Date()
  }

  const mockState: ExtensionState = {
    extensionId: 'test-extension-id',
    profileId: 'profile-1',
    isEnabled: true,
    settings: {},
    permissions: ['tabs']
  }

  const mockAPI = {} as any

  beforeEach(() => {
    context = new ExtensionContext(mockExtension, mockState, mockAPI)
  })

  it('should provide access to extension data', () => {
    expect(context.getExtension()).toBe(mockExtension)
    expect(context.getState()).toBe(mockState)
    expect(context.getAPI()).toBe(mockAPI)
  })

  it('should track initialization state', () => {
    expect(context.isInitialized()).toBe(false)
    
    context.setInitialized(true)
    expect(context.isInitialized()).toBe(true)
  })

  it('should manage message listeners', () => {
    const listener1 = vi.fn()
    const listener2 = vi.fn()

    context.addMessageListener(listener1)
    context.addMessageListener(listener2)

    expect(context['messageListeners'].size).toBe(2)

    context.removeMessageListener(listener1)
    expect(context['messageListeners'].size).toBe(1)
  })

  it('should cleanup properly', async () => {
    const listener = vi.fn()
    context.addMessageListener(listener)
    context.setInitialized(true)

    await context.cleanup()

    expect(context['messageListeners'].size).toBe(0)
    expect(context.isInitialized()).toBe(false)
  })
})