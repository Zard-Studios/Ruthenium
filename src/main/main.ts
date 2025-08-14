import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { BrowserEngine } from '../services/BrowserEngine'
import { ProfileManager } from '../services/ProfileManager'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow
let browserEngine: BrowserEngine
let profileManager: ProfileManager

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false
  })

  // Initialize services
  browserEngine = new BrowserEngine(mainWindow)
  profileManager = new ProfileManager()

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Setup IPC handlers for browser engine
  setupBrowserEngineIPC()
}

function setupBrowserEngineIPC(): void {
  // Initialize profile in browser engine
  ipcMain.handle('browser-engine:initialize-profile', async (event, profile) => {
    try {
      await browserEngine.initializeProfile(profile)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Create new tab
  ipcMain.handle('browser-engine:create-tab', async (event, profileId, url) => {
    try {
      const tab = await browserEngine.createTab(profileId, url)
      return { success: true, tab }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Close tab
  ipcMain.handle('browser-engine:close-tab', async (event, tabId) => {
    try {
      await browserEngine.closeTab(tabId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Navigate tab
  ipcMain.handle('browser-engine:navigate-tab', async (event, tabId, url) => {
    try {
      await browserEngine.navigateTab(tabId, url)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Get profile tabs
  ipcMain.handle('browser-engine:get-profile-tabs', async (event, profileId) => {
    try {
      const tabs = browserEngine.getProfileTabs(profileId)
      return { success: true, tabs }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // Apply user agent
  ipcMain.handle('browser-engine:apply-user-agent', async (event, profileId, userAgent) => {
    try {
      await browserEngine.applyUserAgent(profileId, userAgent)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // User agent management
  ipcMain.handle('browser-engine:get-user-agent-presets', async () => {
    try {
      const presets = browserEngine.getUserAgentPresets()
      return { success: true, presets }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('browser-engine:get-user-agent-presets-by-category', async (event, category) => {
    try {
      const presets = browserEngine.getUserAgentPresetsByCategory(category)
      return { success: true, presets }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('browser-engine:add-custom-user-agent-preset', async (event, preset) => {
    try {
      const customPreset = browserEngine.addCustomUserAgentPreset(preset)
      return { success: true, preset: customPreset }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('browser-engine:remove-custom-user-agent-preset', async (event, id) => {
    try {
      const removed = browserEngine.removeCustomUserAgentPreset(id)
      return { success: true, removed }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('browser-engine:apply-user-agent-preset', async (event, profileId, presetId) => {
    try {
      await browserEngine.applyUserAgentPreset(profileId, presetId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('browser-engine:apply-random-user-agent', async (event, profileId, category) => {
    try {
      const preset = await browserEngine.applyRandomUserAgent(profileId, category)
      return { success: true, preset }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('browser-engine:start-user-agent-rotation', async (event, profileId, intervalMs, category) => {
    try {
      browserEngine.startUserAgentRotation(profileId, intervalMs, category)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('browser-engine:stop-user-agent-rotation', async () => {
    try {
      browserEngine.stopUserAgentRotation()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('browser-engine:validate-user-agent', async (event, userAgentString) => {
    try {
      const isValid = browserEngine.validateUserAgent(userAgentString)
      return { success: true, isValid }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('browser-engine:parse-user-agent', async (event, userAgentString) => {
    try {
      const parsed = browserEngine.parseUserAgent(userAgentString)
      return { success: true, parsed }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('browser-engine:get-user-agent-statistics', async () => {
    try {
      const statistics = browserEngine.getUserAgentStatistics()
      return { success: true, statistics }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

app.whenReady().then(async () => {
  createWindow()

  // Initialize profile manager
  try {
    await profileManager.initialize()
  } catch (error) {
    console.error('Failed to initialize ProfileManager:', error)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', async () => {
  // Cleanup browser engine
  if (browserEngine) {
    await browserEngine.cleanup()
  }
  
  // Close profile manager
  if (profileManager) {
    await profileManager.close()
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})