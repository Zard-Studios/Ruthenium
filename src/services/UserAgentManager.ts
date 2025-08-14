export interface UserAgentPreset {
  id: string
  name: string
  userAgent: string
  category: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'custom'
  platform: string
  browser: string
  version: string
}

export class UserAgentManager {
  private static readonly PRESET_USER_AGENTS: UserAgentPreset[] = [
    // Chrome Desktop
    {
      id: 'chrome-windows-latest',
      name: 'Chrome (Windows)',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      category: 'desktop',
      platform: 'Windows',
      browser: 'Chrome',
      version: '120.0.0.0'
    },
    {
      id: 'chrome-mac-latest',
      name: 'Chrome (macOS)',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      category: 'desktop',
      platform: 'macOS',
      browser: 'Chrome',
      version: '120.0.0.0'
    },
    {
      id: 'chrome-linux-latest',
      name: 'Chrome (Linux)',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      category: 'desktop',
      platform: 'Linux',
      browser: 'Chrome',
      version: '120.0.0.0'
    },

    // Firefox Desktop
    {
      id: 'firefox-windows-latest',
      name: 'Firefox (Windows)',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      category: 'desktop',
      platform: 'Windows',
      browser: 'Firefox',
      version: '121.0'
    },
    {
      id: 'firefox-mac-latest',
      name: 'Firefox (macOS)',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
      category: 'desktop',
      platform: 'macOS',
      browser: 'Firefox',
      version: '121.0'
    },
    {
      id: 'firefox-linux-latest',
      name: 'Firefox (Linux)',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
      category: 'desktop',
      platform: 'Linux',
      browser: 'Firefox',
      version: '121.0'
    },

    // Safari Desktop
    {
      id: 'safari-mac-latest',
      name: 'Safari (macOS)',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      category: 'desktop',
      platform: 'macOS',
      browser: 'Safari',
      version: '17.1'
    },

    // Edge Desktop
    {
      id: 'edge-windows-latest',
      name: 'Edge (Windows)',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      category: 'desktop',
      platform: 'Windows',
      browser: 'Edge',
      version: '120.0.0.0'
    },

    // Mobile Chrome
    {
      id: 'chrome-android-latest',
      name: 'Chrome (Android)',
      userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      category: 'mobile',
      platform: 'Android',
      browser: 'Chrome',
      version: '120.0.0.0'
    },
    {
      id: 'chrome-ios-latest',
      name: 'Chrome (iOS)',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
      category: 'mobile',
      platform: 'iOS',
      browser: 'Chrome',
      version: '120.0.0.0'
    },

    // Mobile Safari
    {
      id: 'safari-ios-latest',
      name: 'Safari (iPhone)',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      category: 'mobile',
      platform: 'iOS',
      browser: 'Safari',
      version: '17.1'
    },
    {
      id: 'safari-ipad-latest',
      name: 'Safari (iPad)',
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      category: 'tablet',
      platform: 'iOS',
      browser: 'Safari',
      version: '17.1'
    },

    // Mobile Firefox
    {
      id: 'firefox-android-latest',
      name: 'Firefox (Android)',
      userAgent: 'Mozilla/5.0 (Mobile; rv:121.0) Gecko/121.0 Firefox/121.0',
      category: 'mobile',
      platform: 'Android',
      browser: 'Firefox',
      version: '121.0'
    },

    // Bots
    {
      id: 'googlebot',
      name: 'Googlebot',
      userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      category: 'bot',
      platform: 'Bot',
      browser: 'Googlebot',
      version: '2.1'
    },
    {
      id: 'bingbot',
      name: 'Bingbot',
      userAgent: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      category: 'bot',
      platform: 'Bot',
      browser: 'Bingbot',
      version: '2.0'
    }
  ]

  private customUserAgents: UserAgentPreset[] = []
  private rotationEnabled = false
  private rotationInterval?: NodeJS.Timeout
  private currentRotationIndex = 0

  /**
   * Get all available user agent presets
   */
  getAllPresets(): UserAgentPreset[] {
    return [...UserAgentManager.PRESET_USER_AGENTS, ...this.customUserAgents]
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category: UserAgentPreset['category']): UserAgentPreset[] {
    return this.getAllPresets().filter(preset => preset.category === category)
  }

  /**
   * Get preset by ID
   */
  getPresetById(id: string): UserAgentPreset | undefined {
    return this.getAllPresets().find(preset => preset.id === id)
  }

  /**
   * Add a custom user agent preset
   */
  addCustomPreset(preset: Omit<UserAgentPreset, 'id'>): UserAgentPreset {
    const customPreset: UserAgentPreset = {
      ...preset,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: 'custom'
    }

    this.customUserAgents.push(customPreset)
    return customPreset
  }

  /**
   * Remove a custom user agent preset
   */
  removeCustomPreset(id: string): boolean {
    const index = this.customUserAgents.findIndex(preset => preset.id === id)
    if (index !== -1) {
      this.customUserAgents.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Get a random user agent from a specific category
   */
  getRandomUserAgent(category?: UserAgentPreset['category']): UserAgentPreset {
    const presets = category ? this.getPresetsByCategory(category) : this.getAllPresets()
    
    if (presets.length === 0) {
      // Fallback to default Chrome user agent
      return UserAgentManager.PRESET_USER_AGENTS[0]
    }

    const randomIndex = Math.floor(Math.random() * presets.length)
    return presets[randomIndex]
  }

  /**
   * Start automatic user agent rotation
   */
  startRotation(intervalMs: number = 300000, category?: UserAgentPreset['category']): void {
    this.stopRotation()
    
    this.rotationEnabled = true
    const presets = category ? this.getPresetsByCategory(category) : this.getAllPresets()
    
    if (presets.length === 0) return

    this.rotationInterval = setInterval(() => {
      this.currentRotationIndex = (this.currentRotationIndex + 1) % presets.length
      const nextUserAgent = presets[this.currentRotationIndex]
      
      // Emit rotation event (can be listened to by profiles)
      this.onRotation?.(nextUserAgent)
    }, intervalMs)
  }

  /**
   * Stop automatic user agent rotation
   */
  stopRotation(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval)
      this.rotationInterval = undefined
    }
    this.rotationEnabled = false
  }

  /**
   * Check if rotation is enabled
   */
  isRotationEnabled(): boolean {
    return this.rotationEnabled
  }

  /**
   * Get the next user agent in rotation
   */
  getNextRotationUserAgent(category?: UserAgentPreset['category']): UserAgentPreset | null {
    if (!this.rotationEnabled) return null

    const presets = category ? this.getPresetsByCategory(category) : this.getAllPresets()
    if (presets.length === 0) return null

    this.currentRotationIndex = (this.currentRotationIndex + 1) % presets.length
    return presets[this.currentRotationIndex]
  }

  /**
   * Parse user agent string to extract browser info
   */
  parseUserAgent(userAgentString: string): Partial<UserAgentPreset> {
    const info: Partial<UserAgentPreset> = {
      userAgent: userAgentString,
      category: 'custom'
    }

    // Detect browser
    if (userAgentString.includes('Chrome') && !userAgentString.includes('Edg')) {
      info.browser = 'Chrome'
      const chromeMatch = userAgentString.match(/Chrome\/([0-9.]+)/)
      if (chromeMatch) info.version = chromeMatch[1]
    } else if (userAgentString.includes('Firefox')) {
      info.browser = 'Firefox'
      const firefoxMatch = userAgentString.match(/Firefox\/([0-9.]+)/)
      if (firefoxMatch) info.version = firefoxMatch[1]
    } else if (userAgentString.includes('Safari') && !userAgentString.includes('Chrome')) {
      info.browser = 'Safari'
      const safariMatch = userAgentString.match(/Version\/([0-9.]+)/)
      if (safariMatch) info.version = safariMatch[1]
    } else if (userAgentString.includes('Edg')) {
      info.browser = 'Edge'
      const edgeMatch = userAgentString.match(/Edg\/([0-9.]+)/)
      if (edgeMatch) info.version = edgeMatch[1]
    }

    // Detect platform - check mobile/tablet first to avoid conflicts
    if (userAgentString.includes('iPhone')) {
      info.platform = 'iOS'
      info.category = 'mobile'
    } else if (userAgentString.includes('iPad')) {
      info.platform = 'iOS'
      info.category = 'tablet'
    } else if (userAgentString.includes('Android')) {
      info.platform = 'Android'
      info.category = userAgentString.includes('Mobile') ? 'mobile' : 'tablet'
    } else if (userAgentString.includes('Windows')) {
      info.platform = 'Windows'
      info.category = 'desktop'
    } else if (userAgentString.includes('Macintosh') || userAgentString.includes('Mac OS X')) {
      info.platform = 'macOS'
      info.category = 'desktop'
    } else if (userAgentString.includes('Linux')) {
      info.platform = 'Linux'
      info.category = 'desktop'
    }

    // Detect bots
    if (userAgentString.includes('bot') || userAgentString.includes('crawler') || userAgentString.includes('spider')) {
      info.category = 'bot'
      info.platform = 'Bot'
    }

    return info
  }

  /**
   * Validate user agent string
   */
  validateUserAgent(userAgentString: string): boolean {
    // Basic validation - check if it looks like a valid user agent
    return userAgentString.length > 10 && 
           userAgentString.includes('Mozilla') && 
           (userAgentString.includes('Chrome') || 
            userAgentString.includes('Firefox') || 
            userAgentString.includes('Safari') || 
            userAgentString.includes('Edge') ||
            userAgentString.includes('bot'))
  }

  /**
   * Event handler for rotation (can be overridden)
   */
  onRotation?: (userAgent: UserAgentPreset) => void

  /**
   * Get user agent statistics
   */
  getStatistics(): {
    totalPresets: number
    presetsByCategory: Record<string, number>
    customPresets: number
    rotationEnabled: boolean
  } {
    const allPresets = this.getAllPresets()
    const presetsByCategory: Record<string, number> = {}

    allPresets.forEach(preset => {
      presetsByCategory[preset.category] = (presetsByCategory[preset.category] || 0) + 1
    })

    return {
      totalPresets: allPresets.length,
      presetsByCategory,
      customPresets: this.customUserAgents.length,
      rotationEnabled: this.rotationEnabled
    }
  }
}