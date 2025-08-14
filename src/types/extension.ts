export interface Extension {
  id: string
  name: string
  version: string
  description: string
  author: string
  manifestVersion: number
  permissions: string[]
  icons: { [size: string]: string }
  isEnabled: boolean
  installDate: Date
  updateDate?: Date
  profileId?: string // For per-profile extensions
}

export interface ExtensionManifest {
  manifest_version: number
  name: string
  version: string
  description?: string
  author?: string
  permissions?: string[]
  icons?: { [size: string]: string }
  background?: {
    scripts?: string[]
    page?: string
    persistent?: boolean
  }
  content_scripts?: Array<{
    matches: string[]
    js?: string[]
    css?: string[]
    run_at?: 'document_start' | 'document_end' | 'document_idle'
  }>
  web_accessible_resources?: string[]
  browser_action?: {
    default_title?: string
    default_icon?: { [size: string]: string }
    default_popup?: string
  }
}

export interface ExtensionInstallOptions {
  profileId?: string
  autoEnable?: boolean
  source: 'firefox-addons' | 'local' | 'developer'
}

export interface ExtensionState {
  extensionId: string
  profileId: string
  isEnabled: boolean
  settings: Record<string, any>
  permissions: string[]
  lastUsed?: Date
}

export interface WebExtensionAPI {
  // Core APIs that extensions can use
  tabs: {
    query: (queryInfo: any) => Promise<any[]>
    create: (createProperties: any) => Promise<any>
    update: (tabId: number, updateProperties: any) => Promise<any>
    remove: (tabIds: number | number[]) => Promise<void>
  }
  storage: {
    local: {
      get: (keys?: string | string[] | null) => Promise<any>
      set: (items: Record<string, any>) => Promise<void>
      remove: (keys: string | string[]) => Promise<void>
      clear: () => Promise<void>
    }
    sync: {
      get: (keys?: string | string[] | null) => Promise<any>
      set: (items: Record<string, any>) => Promise<void>
      remove: (keys: string | string[]) => Promise<void>
      clear: () => Promise<void>
    }
  }
  runtime: {
    sendMessage: (message: any) => Promise<any>
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: any) => void) => void
      removeListener: (callback: Function) => void
    }
    getManifest: () => ExtensionManifest
    getURL: (path: string) => string
  }
}