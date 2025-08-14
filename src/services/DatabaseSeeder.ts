import { DatabaseService, DatabaseUserAgentPreset } from './DatabaseService'
import { v4 as uuidv4 } from 'uuid'

export class DatabaseSeeder {
  private db: DatabaseService

  constructor(db: DatabaseService) {
    this.db = db
  }

  /**
   * Seed the database with initial data
   */
  async seed(): Promise<void> {
    await this.seedUserAgentPresets()
  }

  /**
   * Seed user agent presets with common browsers
   */
  private async seedUserAgentPresets(): Promise<void> {
    const existingPresets = await this.db.getUserAgentPresets()
    
    if (existingPresets.length > 0) {
      console.log('User agent presets already exist, skipping seeding')
      return
    }

    const presets: Omit<DatabaseUserAgentPreset, 'id'>[] = [
      {
        name: 'Chrome Windows',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        description: 'Google Chrome on Windows 10/11'
      },
      {
        name: 'Chrome macOS',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        description: 'Google Chrome on macOS'
      },
      {
        name: 'Chrome Linux',
        user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        description: 'Google Chrome on Linux'
      },
      {
        name: 'Safari macOS',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        description: 'Safari on macOS'
      },
      {
        name: 'Safari iOS',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        description: 'Safari on iOS (iPhone)'
      },
      {
        name: 'Safari iPad',
        user_agent: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        description: 'Safari on iPad'
      },
      {
        name: 'Edge Windows',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        description: 'Microsoft Edge on Windows'
      },
      {
        name: 'Edge macOS',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        description: 'Microsoft Edge on macOS'
      },
      {
        name: 'Firefox Windows',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        description: 'Mozilla Firefox on Windows'
      },
      {
        name: 'Firefox macOS',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
        description: 'Mozilla Firefox on macOS'
      },
      {
        name: 'Firefox Linux',
        user_agent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        description: 'Mozilla Firefox on Linux'
      },
      {
        name: 'Chrome Android',
        user_agent: 'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        description: 'Chrome on Android mobile'
      },
      {
        name: 'Chrome Android Tablet',
        user_agent: 'Mozilla/5.0 (Linux; Android 14; SM-T970) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        description: 'Chrome on Android tablet'
      },
      {
        name: 'Opera Windows',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
        description: 'Opera on Windows'
      },
      {
        name: 'Vivaldi Windows',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Vivaldi/6.5.3206.39',
        description: 'Vivaldi on Windows'
      }
    ]

    console.log('Seeding user agent presets...')
    
    for (const preset of presets) {
      const presetWithId: DatabaseUserAgentPreset = {
        id: uuidv4(),
        ...preset
      }
      
      try {
        await this.db.addUserAgentPreset(presetWithId)
        console.log(`Added user agent preset: ${preset.name}`)
      } catch (error) {
        console.error(`Failed to add user agent preset ${preset.name}:`, error)
      }
    }

    console.log('User agent presets seeding completed')
  }

  /**
   * Check if database needs seeding
   */
  async needsSeeding(): Promise<boolean> {
    const presets = await this.db.getUserAgentPresets()
    return presets.length === 0
  }

  /**
   * Clear all seeded data (for testing)
   */
  async clearSeededData(): Promise<void> {
    // Clear user agent presets
    const presets = await this.db.getUserAgentPresets()
    for (const preset of presets) {
      await (this.db as any).runQuery('DELETE FROM user_agent_presets WHERE id = ?', [preset.id])
    }
    
    console.log('Cleared all seeded data')
  }
}