import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseService } from '../DatabaseService'
import { DatabaseMigrationService } from '../DatabaseMigrations'
import { DatabaseSeeder } from '../DatabaseSeeder'
import { Profile } from '../../models/Profile'
import { Tab } from '../../models/Tab'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('Database Integration', () => {
  let dbService: DatabaseService
  let migrationService: DatabaseMigrationService
  let seeder: DatabaseSeeder
  let testDbPath: string

  beforeEach(async () => {
    // Create a temporary database file for testing
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ruthenium-integration-test-'))
    testDbPath = path.join(tempDir, 'test.db')
    
    // Initialize all services
    dbService = new DatabaseService(testDbPath)
    await dbService.initialize()
    
    migrationService = new DatabaseMigrationService(dbService)
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

  describe('complete database setup workflow', () => {
    it('should setup database with migrations and seeding', async () => {
      // 1. Check initial state
      expect(dbService.isReady()).toBe(true)
      expect(await migrationService.getCurrentVersion()).toBe(0)
      expect(await seeder.needsSeeding()).toBe(true)
      
      // 2. Run migrations
      await migrationService.migrate()
      expect(await migrationService.getCurrentVersion()).toBeGreaterThan(0)
      
      // 3. Seed initial data
      await seeder.seed()
      expect(await seeder.needsSeeding()).toBe(false)
      
      // 4. Verify seeded data
      const presets = await dbService.getUserAgentPresets()
      expect(presets.length).toBeGreaterThan(0)
      expect(presets.some(p => p.name.includes('Chrome'))).toBe(true)
      expect(presets.some(p => p.name.includes('Firefox'))).toBe(true)
    })

    it('should handle complete profile lifecycle with sessions', async () => {
      // Setup database
      await migrationService.migrate()
      await seeder.seed()
      
      // Create a profile
      const profile = new Profile('Integration Test Profile', '🧪')
      profile.updateSettings({
        userAgent: 'Custom User Agent',
        antiFingerprinting: true,
        performanceMode: 'extreme'
      })
      
      await dbService.createProfile(profile.toJSON())
      
      // Create tabs for the profile
      const tab1 = new Tab(profile.id, 'https://example.com', 'Example')
      const tab2 = new Tab(profile.id, 'https://google.com', 'Google')
      tab1.setActive(true)
      
      // Save session
      const sessionId = 'integration-session'
      const windowState = { width: 1200, height: 800, x: 100, y: 100 }
      await dbService.saveSession(sessionId, profile.id, [tab1.toJSON(), tab2.toJSON()], windowState)
      
      // Record performance metrics
      await dbService.recordPerformanceMetrics(profile.id, 512, 25.5)
      await dbService.recordPerformanceMetrics(profile.id, 600, 30.2)
      
      // Update profile last used
      await dbService.updateProfileLastUsed(profile.id)
      
      // Verify everything was saved correctly
      const retrievedProfile = await dbService.getProfile(profile.id)
      expect(retrievedProfile).toBeDefined()
      expect(retrievedProfile!.name).toBe('Integration Test Profile')
      expect(retrievedProfile!.settings.userAgent).toBe('Custom User Agent')
      expect(retrievedProfile!.settings.antiFingerprinting).toBe(true)
      
      const session = await dbService.getLatestSession(profile.id)
      expect(session).toBeDefined()
      expect(session!.id).toBe(sessionId)
      
      const savedTabs = JSON.parse(session!.tabs)
      expect(savedTabs).toHaveLength(2)
      expect(savedTabs[0].url).toBe('https://example.com')
      expect(savedTabs[0].isActive).toBe(true)
      expect(savedTabs[1].url).toBe('https://google.com')
      expect(savedTabs[1].isActive).toBe(false)
      
      const savedWindowState = JSON.parse(session!.window_state)
      expect(savedWindowState.width).toBe(1200)
      expect(savedWindowState.height).toBe(800)
      
      const metrics = await dbService.getPerformanceMetrics(profile.id)
      expect(metrics).toHaveLength(2)
      expect(metrics[0].memory_usage).toBe(600) // Latest first
      expect(metrics[1].memory_usage).toBe(512)
    })

    it('should handle multiple profiles with isolation', async () => {
      await migrationService.migrate()
      
      // Create multiple profiles
      const profile1 = new Profile('Work Profile', '💼')
      const profile2 = new Profile('Personal Profile', '🏠')
      const profile3 = new Profile('Gaming Profile', '🎮')
      
      profile1.updateSettings({ performanceMode: 'standard' })
      profile2.updateSettings({ performanceMode: 'extreme', antiFingerprinting: true })
      profile3.updateSettings({ userAgent: 'Gaming Browser' })
      
      await dbService.createProfile(profile1.toJSON())
      await dbService.createProfile(profile2.toJSON())
      await dbService.createProfile(profile3.toJSON())
      
      // Create different sessions for each profile
      const workTabs = [new Tab(profile1.id, 'https://slack.com', 'Slack')]
      const personalTabs = [
        new Tab(profile2.id, 'https://facebook.com', 'Facebook'),
        new Tab(profile2.id, 'https://instagram.com', 'Instagram')
      ]
      const gamingTabs = [new Tab(profile3.id, 'https://steam.com', 'Steam')]
      
      await dbService.saveSession('work-session', profile1.id, workTabs.map(t => t.toJSON()), {})
      await dbService.saveSession('personal-session', profile2.id, personalTabs.map(t => t.toJSON()), {})
      await dbService.saveSession('gaming-session', profile3.id, gamingTabs.map(t => t.toJSON()), {})
      
      // Record different performance metrics for each
      await dbService.recordPerformanceMetrics(profile1.id, 300, 15.0)
      await dbService.recordPerformanceMetrics(profile2.id, 800, 45.0)
      await dbService.recordPerformanceMetrics(profile3.id, 1200, 60.0)
      
      // Verify isolation
      const allProfiles = await dbService.getAllProfiles()
      expect(allProfiles).toHaveLength(3)
      
      const workSession = await dbService.getLatestSession(profile1.id)
      const personalSession = await dbService.getLatestSession(profile2.id)
      const gamingSession = await dbService.getLatestSession(profile3.id)
      
      expect(JSON.parse(workSession!.tabs)).toHaveLength(1)
      expect(JSON.parse(personalSession!.tabs)).toHaveLength(2)
      expect(JSON.parse(gamingSession!.tabs)).toHaveLength(1)
      
      expect(JSON.parse(workSession!.tabs)[0].url).toBe('https://slack.com')
      expect(JSON.parse(personalSession!.tabs)[0].url).toBe('https://facebook.com')
      expect(JSON.parse(gamingSession!.tabs)[0].url).toBe('https://steam.com')
      
      const workMetrics = await dbService.getPerformanceMetrics(profile1.id)
      const personalMetrics = await dbService.getPerformanceMetrics(profile2.id)
      const gamingMetrics = await dbService.getPerformanceMetrics(profile3.id)
      
      expect(workMetrics[0].memory_usage).toBe(300)
      expect(personalMetrics[0].memory_usage).toBe(800)
      expect(gamingMetrics[0].memory_usage).toBe(1200)
    })

    it('should handle database migration and rollback scenarios', async () => {
      // Initial setup
      expect(await migrationService.getCurrentVersion()).toBe(0)
      
      // Run migrations
      await migrationService.migrate()
      const currentVersion = await migrationService.getCurrentVersion()
      expect(currentVersion).toBeGreaterThan(0)
      
      // Create some data
      const profile = new Profile('Test Profile', '🧪')
      await dbService.createProfile(profile.toJSON())
      
      // Verify migration status
      const status = await migrationService.getMigrationStatus()
      expect(status.length).toBe(currentVersion)
      expect(status.every(s => s.applied_at)).toBe(true)
      
      // Test rollback
      if (currentVersion > 1) {
        await migrationService.rollback(1)
        expect(await migrationService.getCurrentVersion()).toBe(1)
        
        // Data should still be accessible
        const retrievedProfile = await dbService.getProfile(profile.id)
        expect(retrievedProfile).toBeDefined()
        
        // Re-run migrations
        await migrationService.migrate()
        expect(await migrationService.getCurrentVersion()).toBe(currentVersion)
      }
    })

    it('should handle user agent presets integration', async () => {
      await migrationService.migrate()
      await seeder.seed()
      
      // Get available presets
      const presets = await dbService.getUserAgentPresets()
      expect(presets.length).toBeGreaterThan(0)
      
      // Create profile with preset user agent
      const chromePreset = presets.find(p => p.name.includes('Chrome Windows'))
      expect(chromePreset).toBeDefined()
      
      const profile = new Profile('Chrome Profile', '🌐')
      profile.updateSettings({ userAgent: chromePreset!.user_agent })
      
      await dbService.createProfile(profile.toJSON())
      
      // Verify the user agent was saved correctly
      const retrievedProfile = await dbService.getProfile(profile.id)
      expect(retrievedProfile!.settings.userAgent).toBe(chromePreset!.user_agent)
      expect(retrievedProfile!.settings.userAgent).toMatch(/Chrome/)
      expect(retrievedProfile!.settings.userAgent).toMatch(/Windows/)
    })

    it('should handle cleanup operations', async () => {
      await migrationService.migrate()
      await seeder.seed()
      
      const profile = new Profile('Cleanup Test Profile', '🧹')
      await dbService.createProfile(profile.toJSON())
      
      // Create multiple sessions
      for (let i = 0; i < 10; i++) {
        await dbService.saveSession(`session-${i}`, profile.id, [], {})
        await new Promise(resolve => setTimeout(resolve, 5)) // Small delay for different timestamps
      }
      
      // Create multiple performance metrics
      for (let i = 0; i < 20; i++) {
        await dbService.recordPerformanceMetrics(profile.id, 100 + i, 10 + i)
        await new Promise(resolve => setTimeout(resolve, 2))
      }
      
      // Cleanup old sessions (keep only 3)
      await dbService.cleanupOldSessions(3)
      
      // Verify cleanup worked
      const latestSession = await dbService.getLatestSession(profile.id)
      expect(latestSession).toBeDefined()
      expect(latestSession!.id).toBe('session-9') // Latest session should still exist
      
      // Verify metrics are still there (no automatic cleanup)
      const metrics = await dbService.getPerformanceMetrics(profile.id)
      expect(metrics.length).toBe(20)
      
      // Test profile deletion (should cascade)
      await dbService.deleteProfile(profile.id)
      
      const deletedProfile = await dbService.getProfile(profile.id)
      expect(deletedProfile).toBeUndefined()
      
      const deletedSession = await dbService.getLatestSession(profile.id)
      expect(deletedSession).toBeUndefined()
      
      const deletedMetrics = await dbService.getPerformanceMetrics(profile.id)
      expect(deletedMetrics).toHaveLength(0)
    })
  })
})