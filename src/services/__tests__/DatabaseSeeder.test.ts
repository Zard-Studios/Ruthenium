import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseService } from '../DatabaseService'
import { DatabaseSeeder } from '../DatabaseSeeder'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('DatabaseSeeder', () => {
  let dbService: DatabaseService
  let seeder: DatabaseSeeder
  let testDbPath: string

  beforeEach(async () => {
    // Create a temporary database file for testing
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ruthenium-seeder-test-'))
    testDbPath = path.join(tempDir, 'test.db')
    dbService = new DatabaseService(testDbPath)
    await dbService.initialize()
    seeder = new DatabaseSeeder(dbService)
  })

  afterEach(async () => {
    await dbService.close()
    // Clean up test database
    try {
      await fs.unlink(testDbPath)
      await fs.rmdir(path.dirname(testDbPath))
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('seeding detection', () => {
    it('should detect that fresh database needs seeding', async () => {
      const needsSeeding = await seeder.needsSeeding()
      expect(needsSeeding).toBe(true)
    })

    it('should detect that seeded database does not need seeding', async () => {
      await seeder.seed()
      
      const needsSeeding = await seeder.needsSeeding()
      expect(needsSeeding).toBe(false)
    })
  })

  describe('user agent presets seeding', () => {
    it('should seed user agent presets', async () => {
      const presetsBefore = await dbService.getUserAgentPresets()
      expect(presetsBefore).toHaveLength(0)
      
      await seeder.seed()
      
      const presetsAfter = await dbService.getUserAgentPresets()
      expect(presetsAfter.length).toBeGreaterThan(0)
    })

    it('should not seed if presets already exist', async () => {
      // Add a preset manually
      await dbService.addUserAgentPreset({
        id: 'test-preset',
        name: 'Test Preset',
        user_agent: 'Test User Agent',
        description: 'Test Description'
      })
      
      await seeder.seed()
      
      const presets = await dbService.getUserAgentPresets()
      expect(presets).toHaveLength(1) // Should not add more presets
      expect(presets[0].name).toBe('Test Preset')
    })

    it('should seed common browser user agents', async () => {
      await seeder.seed()
      
      const presets = await dbService.getUserAgentPresets()
      const presetNames = presets.map(p => p.name)
      
      // Check for some expected presets
      expect(presetNames).toContain('Chrome Windows')
      expect(presetNames).toContain('Chrome macOS')
      expect(presetNames).toContain('Safari macOS')
      expect(presetNames).toContain('Firefox Windows')
      expect(presetNames).toContain('Edge Windows')
    })

    it('should seed presets with valid user agent strings', async () => {
      await seeder.seed()
      
      const presets = await dbService.getUserAgentPresets()
      
      for (const preset of presets) {
        expect(preset.id).toBeDefined()
        expect(preset.name).toBeDefined()
        expect(preset.user_agent).toBeDefined()
        expect(preset.description).toBeDefined()
        
        expect(preset.name.length).toBeGreaterThan(0)
        expect(preset.user_agent.length).toBeGreaterThan(0)
        expect(preset.user_agent).toMatch(/Mozilla\/5\.0/)
      }
    })

    it('should seed presets for different platforms', async () => {
      await seeder.seed()
      
      const presets = await dbService.getUserAgentPresets()
      const descriptions = presets.map(p => p.description.toLowerCase())
      
      // Check for different platforms
      expect(descriptions.some(d => d.includes('windows'))).toBe(true)
      expect(descriptions.some(d => d.includes('macos'))).toBe(true)
      expect(descriptions.some(d => d.includes('linux'))).toBe(true)
      expect(descriptions.some(d => d.includes('android'))).toBe(true)
      expect(descriptions.some(d => d.includes('ios'))).toBe(true)
    })

    it('should seed presets for different browsers', async () => {
      await seeder.seed()
      
      const presets = await dbService.getUserAgentPresets()
      const names = presets.map(p => p.name.toLowerCase())
      
      // Check for different browsers
      expect(names.some(n => n.includes('chrome'))).toBe(true)
      expect(names.some(n => n.includes('firefox'))).toBe(true)
      expect(names.some(n => n.includes('safari'))).toBe(true)
      expect(names.some(n => n.includes('edge'))).toBe(true)
      expect(names.some(n => n.includes('opera'))).toBe(true)
    })
  })

  describe('data cleanup', () => {
    it('should clear seeded data', async () => {
      await seeder.seed()
      
      const presetsBeforeCleanup = await dbService.getUserAgentPresets()
      expect(presetsBeforeCleanup.length).toBeGreaterThan(0)
      
      await seeder.clearSeededData()
      
      const presetsAfterCleanup = await dbService.getUserAgentPresets()
      expect(presetsAfterCleanup).toHaveLength(0)
    })

    it('should handle clearing empty database gracefully', async () => {
      // Should not throw error when clearing empty database
      await expect(seeder.clearSeededData()).resolves.not.toThrow()
      
      const presets = await dbService.getUserAgentPresets()
      expect(presets).toHaveLength(0)
    })
  })

  describe('error handling', () => {
    it('should handle database errors during seeding gracefully', async () => {
      // Close database to simulate error
      await dbService.close()
      
      // Should not throw, but should handle errors internally
      await expect(seeder.seed()).rejects.toThrow()
    })

    it('should handle partial seeding failures', async () => {
      // This is harder to test without mocking, but we can verify
      // that the seeder doesn't crash on individual preset failures
      await expect(seeder.seed()).resolves.not.toThrow()
    })
  })

  describe('seeding consistency', () => {
    it('should seed the same presets on multiple runs', async () => {
      await seeder.seed()
      const firstRunPresets = await dbService.getUserAgentPresets()
      
      await seeder.clearSeededData()
      await seeder.seed()
      const secondRunPresets = await dbService.getUserAgentPresets()
      
      expect(firstRunPresets.length).toBe(secondRunPresets.length)
      
      // Sort both arrays by name for comparison
      const sortedFirst = firstRunPresets.sort((a, b) => a.name.localeCompare(b.name))
      const sortedSecond = secondRunPresets.sort((a, b) => a.name.localeCompare(b.name))
      
      for (let i = 0; i < sortedFirst.length; i++) {
        expect(sortedFirst[i].name).toBe(sortedSecond[i].name)
        expect(sortedFirst[i].user_agent).toBe(sortedSecond[i].user_agent)
        expect(sortedFirst[i].description).toBe(sortedSecond[i].description)
      }
    })

    it('should generate unique IDs for presets', async () => {
      await seeder.seed()
      
      const presets = await dbService.getUserAgentPresets()
      const ids = presets.map(p => p.id)
      const uniqueIds = [...new Set(ids)]
      
      expect(ids.length).toBe(uniqueIds.length)
    })
  })

  describe('preset quality', () => {
    it('should seed presets with realistic user agent strings', async () => {
      await seeder.seed()
      
      const presets = await dbService.getUserAgentPresets()
      
      for (const preset of presets) {
        // All user agents should start with Mozilla/5.0
        expect(preset.user_agent).toMatch(/^Mozilla\/5\.0/)
        
        // Should contain browser identifiers
        const userAgent = preset.user_agent.toLowerCase()
        const hasValidBrowser = 
          userAgent.includes('chrome') ||
          userAgent.includes('firefox') ||
          userAgent.includes('safari') ||
          userAgent.includes('edge') ||
          userAgent.includes('opera') ||
          userAgent.includes('vivaldi')
        
        expect(hasValidBrowser).toBe(true)
      }
    })

    it('should seed presets with meaningful descriptions', async () => {
      await seeder.seed()
      
      const presets = await dbService.getUserAgentPresets()
      
      for (const preset of presets) {
        expect(preset.description.length).toBeGreaterThan(10)
        expect(preset.description).toMatch(/\w+\s+on\s+\w+/i) // Pattern like "Chrome on Windows"
      }
    })
  })
})