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
  
  // Browser management
  createTab: (profileId: string, url?: string) => 
    ipcRenderer.invoke('browser:createTab', profileId, url),
  closeTab: (tabId: string) => 
    ipcRenderer.invoke('browser:closeTab', tabId),
  navigateTab: (tabId: string, url: string) => 
    ipcRenderer.invoke('browser:navigate', tabId, url),
  
  // Event listeners
  onProfileChanged: (callback: (profile: any) => void) => 
    ipcRenderer.on('profile:changed', (_event, profile) => callback(profile)),
  onTabUpdated: (callback: (tab: any) => void) => 
    ipcRenderer.on('tab:updated', (_event, tab) => callback(tab))
})