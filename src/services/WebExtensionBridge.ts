import { WebExtensionAPI, Extension, ExtensionState } from '../types/extension'
import { ExtensionManager } from './ExtensionManager'
import { BrowserEngine } from './BrowserEngine'
import { ProfileManager } from './ProfileManager'
import { EventEmitter } from 'events'

export class WebExtensionBridge extends EventEmitter {
  private extensionManager: ExtensionManager
  private browserEngine: BrowserEngine
  private profileManager: ProfileManager
  private extensionContexts: Map<string, ExtensionContext> = new Map()

  constructor(
    extensionManager: ExtensionManager,
    browserEngine: BrowserEngine,
    profileManager: ProfileManager
  ) {
    super()
    this.extensionManager = extensionManager
    this.browserEngine = browserEngine
    this.profileManager = profileManager
  }

  async initializeExtensionForProfile(profileId: string, extensionId: string): Promise<void> {
    const extension = this.extensionManager.getAllExtensions().find(ext => ext.id === extensionId)
    const extensionState = await this.extensionManager.getExtensionState(profileId, extensionId)
    
    if (!extension || !extensionState || !extensionState.isEnabled) {
      return
    }

    // Create extension context
    const context = new ExtensionContext(extension, extensionState, this.createWebExtensionAPI(profileId, extensionId))
    this.extensionContexts.set(`${profileId}-${extensionId}`, context)

    // Initialize extension background scripts
    await this.initializeBackgroundScripts(context)

    this.emit('extensionInitialized', { profileId, extensionId })
  }

  async deinitializeExtensionForProfile(profileId: string, extensionId: string): Promise<void> {
    const contextKey = `${profileId}-${extensionId}`
    const context = this.extensionContexts.get(contextKey)
    
    if (context) {
      await context.cleanup()
      this.extensionContexts.delete(contextKey)
      this.emit('extensionDeinitialized', { profileId, extensionId })
    }
  }

  getExtensionContext(profileId: string, extensionId: string): ExtensionContext | undefined {
    return this.extensionContexts.get(`${profileId}-${extensionId}`)
  }

  private createWebExtensionAPI(profileId: string, extensionId: string): WebExtensionAPI {
    return {
      tabs: {
        query: async (queryInfo: any) => {
          const tabs = this.browserEngine.getProfileTabs(profileId)
          return tabs.filter(tab => {
            if (queryInfo.active !== undefined && tab.isActive !== queryInfo.active) return false
            if (queryInfo.url && !tab.url.includes(queryInfo.url)) return false
            return true
          }).map(tab => ({
            id: parseInt(tab.id),
            url: tab.url,
            title: tab.title,
            active: tab.isActive,
            windowId: 1 // Simplified for now
          }))
        },

        create: async (createProperties: any) => {
          const tab = await this.browserEngine.createTab(profileId, createProperties.url)
          return {
            id: parseInt(tab.id),
            url: tab.url,
            title: tab.title,
            active: tab.isActive,
            windowId: 1
          }
        },

        update: async (tabId: number, updateProperties: any) => {
          const tab = this.browserEngine.getProfileTabs(profileId).find(t => t.id === tabId.toString())
          if (!tab) throw new Error(`Tab ${tabId} not found`)
          
          if (updateProperties.url) {
            await this.browserEngine.navigateTab(tab.id, updateProperties.url)
          }
          
          return {
            id: tabId,
            url: updateProperties.url || tab.url,
            title: tab.title,
            active: tab.isActive,
            windowId: 1
          }
        },

        remove: async (tabIds: number | number[]) => {
          const ids = Array.isArray(tabIds) ? tabIds : [tabIds]
          for (const id of ids) {
            await this.browserEngine.closeTab(id.toString())
          }
        }
      },

      storage: {
        local: {
          get: async (keys?: string | string[] | null) => {
            return this.getExtensionStorage(profileId, extensionId, 'local', keys)
          },
          set: async (items: Record<string, any>) => {
            return this.setExtensionStorage(profileId, extensionId, 'local', items)
          },
          remove: async (keys: string | string[]) => {
            return this.removeExtensionStorage(profileId, extensionId, 'local', keys)
          },
          clear: async () => {
            return this.clearExtensionStorage(profileId, extensionId, 'local')
          }
        },

        sync: {
          get: async (keys?: string | string[] | null) => {
            return this.getExtensionStorage(profileId, extensionId, 'sync', keys)
          },
          set: async (items: Record<string, any>) => {
            return this.setExtensionStorage(profileId, extensionId, 'sync', items)
          },
          remove: async (keys: string | string[]) => {
            return this.removeExtensionStorage(profileId, extensionId, 'sync', keys)
          },
          clear: async () => {
            return this.clearExtensionStorage(profileId, extensionId, 'sync')
          }
        }
      },

      runtime: {
        sendMessage: async (message: any) => {
          return this.sendMessageToExtension(profileId, extensionId, message)
        },

        onMessage: {
          addListener: (callback: (message: any, sender: any, sendResponse: any) => void) => {
            this.addMessageListener(profileId, extensionId, callback)
          },
          removeListener: (callback: Function) => {
            this.removeMessageListener(profileId, extensionId, callback)
          }
        },

        getManifest: () => {
          const extension = this.extensionManager.getAllExtensions().find(ext => ext.id === extensionId)
          if (!extension) throw new Error(`Extension ${extensionId} not found`)
          
          return {
            manifest_version: extension.manifestVersion,
            name: extension.name,
            version: extension.version,
            description: extension.description,
            author: extension.author,
            permissions: extension.permissions,
            icons: extension.icons
          }
        },

        getURL: (path: string) => {
          return `extension://${extensionId}/${path}`
        }
      }
    }
  }

  private async initializeBackgroundScripts(context: ExtensionContext): Promise<void> {
    // This would load and execute background scripts in a sandboxed environment
    // For now, we'll just mark the context as initialized
    context.setInitialized(true)
  }

  private async getExtensionStorage(
    profileId: string, 
    extensionId: string, 
    storageType: 'local' | 'sync', 
    keys?: string | string[] | null
  ): Promise<any> {
    const state = await this.extensionManager.getExtensionState(profileId, extensionId)
    if (!state) return {}

    const storage = state.settings[`storage_${storageType}`] || {}
    
    if (keys === null || keys === undefined) {
      return storage
    }
    
    const keyArray = Array.isArray(keys) ? keys : [keys]
    const result: any = {}
    
    for (const key of keyArray) {
      if (key in storage) {
        result[key] = storage[key]
      }
    }
    
    return result
  }

  private async setExtensionStorage(
    profileId: string, 
    extensionId: string, 
    storageType: 'local' | 'sync', 
    items: Record<string, any>
  ): Promise<void> {
    const state = await this.extensionManager.getExtensionState(profileId, extensionId)
    if (!state) throw new Error('Extension state not found')

    const storageKey = `storage_${storageType}`
    const currentStorage = state.settings[storageKey] || {}
    const updatedStorage = { ...currentStorage, ...items }
    
    // Update the extension state
    const updatedSettings = { ...state.settings, [storageKey]: updatedStorage }
    await this.extensionManager['updateProfileExtensionState'](profileId, extensionId, {
      settings: updatedSettings
    })
  }

  private async removeExtensionStorage(
    profileId: string, 
    extensionId: string, 
    storageType: 'local' | 'sync', 
    keys: string | string[]
  ): Promise<void> {
    const state = await this.extensionManager.getExtensionState(profileId, extensionId)
    if (!state) throw new Error('Extension state not found')

    const storageKey = `storage_${storageType}`
    const currentStorage = { ...state.settings[storageKey] } || {}
    const keyArray = Array.isArray(keys) ? keys : [keys]
    
    for (const key of keyArray) {
      delete currentStorage[key]
    }
    
    const updatedSettings = { ...state.settings, [storageKey]: currentStorage }
    await this.extensionManager['updateProfileExtensionState'](profileId, extensionId, {
      settings: updatedSettings
    })
  }

  private async clearExtensionStorage(
    profileId: string, 
    extensionId: string, 
    storageType: 'local' | 'sync'
  ): Promise<void> {
    const state = await this.extensionManager.getExtensionState(profileId, extensionId)
    if (!state) throw new Error('Extension state not found')

    const storageKey = `storage_${storageType}`
    const updatedSettings = { ...state.settings, [storageKey]: {} }
    
    await this.extensionManager['updateProfileExtensionState'](profileId, extensionId, {
      settings: updatedSettings
    })
  }

  private async sendMessageToExtension(profileId: string, extensionId: string, message: any): Promise<any> {
    // Emit message event for the extension to handle
    this.emit('extensionMessage', { profileId, extensionId, message })
    
    // For now, return a simple acknowledgment
    return { success: true }
  }

  private addMessageListener(profileId: string, extensionId: string, callback: Function): void {
    const eventName = `message-${profileId}-${extensionId}`
    this.on(eventName, callback)
  }

  private removeMessageListener(profileId: string, extensionId: string, callback: Function): void {
    const eventName = `message-${profileId}-${extensionId}`
    this.off(eventName, callback)
  }
}

export class ExtensionContext {
  private extension: Extension
  private state: ExtensionState
  private api: WebExtensionAPI
  private initialized: boolean = false
  private messageListeners: Set<Function> = new Set()

  constructor(extension: Extension, state: ExtensionState, api: WebExtensionAPI) {
    this.extension = extension
    this.state = state
    this.api = api
  }

  getExtension(): Extension {
    return this.extension
  }

  getState(): ExtensionState {
    return this.state
  }

  getAPI(): WebExtensionAPI {
    return this.api
  }

  isInitialized(): boolean {
    return this.initialized
  }

  setInitialized(initialized: boolean): void {
    this.initialized = initialized
  }

  addMessageListener(listener: Function): void {
    this.messageListeners.add(listener)
  }

  removeMessageListener(listener: Function): void {
    this.messageListeners.delete(listener)
  }

  async cleanup(): Promise<void> {
    this.messageListeners.clear()
    this.initialized = false
  }
}