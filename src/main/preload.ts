import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Profile management
  createProfile: (name: string, icon: string) => 
    ipcRenderer.invoke('profile:create', name, icon),
  deleteProfile: (profileId: string) => 
    ipcRenderer.invoke('profile:delete', profileId),
  switchProfile: (profileId: string) => 
    ipcRenderer.invoke('profile:switch', profileId),
  getAllProfiles: () => 
    ipcRenderer.invoke('profile:getAll'),
  
  // Browser engine management
  initializeProfile: (profile: any) => 
    ipcRenderer.invoke('browser-engine:initialize-profile', profile),
  createTab: (profileId: string, url?: string) => 
    ipcRenderer.invoke('browser-engine:create-tab', profileId, url),
  closeTab: (tabId: string) => 
    ipcRenderer.invoke('browser-engine:close-tab', tabId),
  navigateTab: (tabId: string, url: string) => 
    ipcRenderer.invoke('browser-engine:navigate-tab', tabId, url),
  getProfileTabs: (profileId: string) => 
    ipcRenderer.invoke('browser-engine:get-profile-tabs', profileId),
  applyUserAgent: (profileId: string, userAgent: string) => 
    ipcRenderer.invoke('browser-engine:apply-user-agent', profileId, userAgent),
  
  // User agent management
  getUserAgentPresets: () => 
    ipcRenderer.invoke('browser-engine:get-user-agent-presets'),
  getUserAgentPresetsByCategory: (category: string) => 
    ipcRenderer.invoke('browser-engine:get-user-agent-presets-by-category', category),
  addCustomUserAgentPreset: (preset: any) => 
    ipcRenderer.invoke('browser-engine:add-custom-user-agent-preset', preset),
  removeCustomUserAgentPreset: (id: string) => 
    ipcRenderer.invoke('browser-engine:remove-custom-user-agent-preset', id),
  applyUserAgentPreset: (profileId: string, presetId: string) => 
    ipcRenderer.invoke('browser-engine:apply-user-agent-preset', profileId, presetId),
  applyRandomUserAgent: (profileId: string, category?: string) => 
    ipcRenderer.invoke('browser-engine:apply-random-user-agent', profileId, category),
  startUserAgentRotation: (profileId: string, intervalMs?: number, category?: string) => 
    ipcRenderer.invoke('browser-engine:start-user-agent-rotation', profileId, intervalMs, category),
  stopUserAgentRotation: () => 
    ipcRenderer.invoke('browser-engine:stop-user-agent-rotation'),
  validateUserAgent: (userAgentString: string) => 
    ipcRenderer.invoke('browser-engine:validate-user-agent', userAgentString),
  parseUserAgent: (userAgentString: string) => 
    ipcRenderer.invoke('browser-engine:parse-user-agent', userAgentString),
  getUserAgentStatistics: () => 
    ipcRenderer.invoke('browser-engine:get-user-agent-statistics'),
  
  // Legacy browser management (for backward compatibility)
  legacyCreateTab: (profileId: string, url?: string) => 
    ipcRenderer.invoke('browser:createTab', profileId, url),
  legacyCloseTab: (tabId: string) => 
    ipcRenderer.invoke('browser:closeTab', tabId),
  legacyNavigateTab: (tabId: string, url: string) => 
    ipcRenderer.invoke('browser:navigate', tabId, url),
  
  // Event listeners
  onProfileChanged: (callback: (profile: any) => void) => 
    ipcRenderer.on('profile:changed', (_event, profile) => callback(profile)),
  onTabUpdated: (callback: (tab: any) => void) => 
    ipcRenderer.on('tab:updated', (_event, tab) => callback(tab))
})