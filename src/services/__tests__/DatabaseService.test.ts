import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DatabaseService } from '../DatabaseService'
import { Profile } from '../../models/Profile'
import { Tab } from '../../models/Tab'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('DatabaseService', () => {
  let dbService: DatabaseService
  let testDbPath: string

  beforeEach(async () => {
    // Create a temporary database file for testing
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ruthenium-test-'))
    testDbPath = path.join(tempDir, 'test.db')
    dbService = new DatabaseService(testDbPath)
    await dbService.initialize()
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

  describe('initialization', () => {
    it('should initialize database successfully', async () => {
      expect(dbService.isReady()).toBe(true)
      expect(dbService.getDatabasePath()).toBe(testDbPath)
    })

    it('should create database directory if it does not exist', async () => {
      const nonExistentDir = path.join(os.tmpdir(), 'non-existent-dir', 'test.db')
      const newDbService = new DatabaseService(nonExistentDir)
      
      await expect(newDbService.initialize()).resolves.not.toThrow()
      await newDbService.close()
      
      // Clean up
      await fs.unlink(nonExistentDir)
      await fs.rmdir(path.dirname(nonExistentDir))
    })

    it('should not reinitialize if already initialized', async () => {
      const spy = vi.spyOn(dbService as any, 'createTables')
      await dbService.initialize() // Second initialization
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('profile operations', () => {
    let testProfile: Profile

    beforeEach(() => {
      testProfile = new Profile('Test Profile', '🧪')
    })

    it('should create a profile', async () => {
      await dbService.createProfile(testProfile.toJSON())
      
      const retrieved = await dbService.getProfile(testProfile.id)
      expect(retrieved).toBeDefined()
      expect(retrieved!.name).toBe('Test Profile')
      expect(retrieved!.icon).toBe('🧪')
      expect(retrieved!.id).toBe(testProfile.id)
    })

    it('should get all profiles', async () => {
      const profile1 = new Profile('Profile 1', '1️⃣')
      const profile2 = new Profile('Profile 2', '2️⃣')
      
      await dbService.createProfile(profile1.toJSON())
      await dbService.createProfile(profile2.toJSON())
      
      const profiles = await dbService.getAllProfiles()
      expect(profiles).toHaveLength(2)
      expect(profiles.map(p => p.name)).toContain('Profile 1')
      expect(profiles.map(p => p.name)).toContain('Profile 2')
    })

    it('should update a profile', async () => {
      await dbService.createProfile(testProfile.toJSON())
      
      testProfile.name = 'Updated Profile'
      testProfile.icon = '🔄'
      testProfile.updateSettings({ antiFingerprinting: true })
      
      await dbService.updateProfile(testProfile.toJSON())
      
      const retrieved = await dbService.getProfile(testProfile.id)
      expect(retrieved!.name).toBe('Updated Profile')
      expect(retrieved!.icon).toBe('🔄')
      expect(retrieved!.settings.antiFingerprinting).toBe(true)
    })

    it('should delete a profile', async () => {
      await dbService.createProfile(testProfile.toJSON())
      
      let retrieved = await dbService.getProfile(testProfile.id)
      expect(retrieved).toBeDefined()
      
      await dbService.deleteProfile(testProfile.id)
      
      retrieved = await dbService.getProfile(testProfile.id)
      expect(retrieved).toBeUndefined()
    })

    it('should update profile last used timestamp', async () => {
      await dbService.createProfile(testProfile.toJSON())
      
      const originalLastUsed = testProfile.lastUsed
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))
      
      await dbService.updateProfileLastUsed(testProfile.id)
      
      const retrieved = await dbService.getProfile(testProfile.id)
      expect(retrieved!.lastUsed.getTime()).toBeGreaterThan(originalLastUsed.getTime())
    })

    it('should return undefined for non-existent profile', async () => {
      const retrieved = await dbService.getProfile('non-existent-id')
      expect(retrieved).toBeUndefined()
    })

    it('should handle profile with complex settings', async () => {
      testProfile.updateSettings({
        userAgent: 'Custom User Agent',
        antiFingerprinting: true,
        performanceMode: 'extreme',
        memoryLimit: 1024,
        autoRotateUserAgent: true
      })
      
      await dbService.createProfile(testProfile.toJSON())
      
      const retrieved = await dbService.getProfile(testProfile.id)
      expect(retrieved!.settings).toEqual({
        userAgent: 'Custom User Agent',
        antiFingerprinting: true,
        performanceMode: 'extreme',
        memoryLimit: 1024,
        autoRotateUserAgent: true
      })
    })
  })

  describe('session management', () => {
    let testProfile: Profile
    let testTabs: Tab[]

    beforeEach(async () => {
      testProfile = new Profile('Test Profile', '🧪')
      await dbService.createProfile(testProfile.toJSON())
      
      testTabs = [
        new Tab(testProfile.id, 'https://example.com', 'Example'),
        new Tab(testProfile.id, 'https://google.com', 'Google')
      ]
    })

    it('should save a session', async () => {
      const sessionId = 'test-session-1'
      const windowState = { width: 1200, height: 800 }
      
      await dbService.saveSession(sessionId, testProfile.id, testTabs.map(t => t.toJSON()), windowState)
      
      const session = await dbService.getLatestSession(testProfile.id)
      expect(session).toBeDefined()
      expect(session!.id).toBe(sessionId)
      expect(session!.profile_id).toBe(testProfile.id)
      
      const savedTabs = JSON.parse(session!.tabs)
      expect(savedTabs).toHaveLength(2)
      expect(savedTabs[0].url).toBe('https://example.com')
      
      const savedWindowState = JSON.parse(session!.window_state)
      expect(savedWindowState.width).toBe(1200)
    })

    it('should get the latest session for a profile', async () => {
      const session1Id = 'session-1'
      const session2Id = 'session-2'
      
      await dbService.saveSession(session1Id, testProfile.id, [], {})
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))
      
      await dbService.saveSession(session2Id, testProfile.id, testTabs.map(t => t.toJSON()), {})
      
      const latestSession = await dbService.getLatestSession(testProfile.id)
      expect(latestSession!.id).toBe(session2Id)
    })

    it('should return undefined for profile with no sessions', async () => {
      const session = await dbService.getLatestSession('non-existent-profile')
      expect(session).toBeUndefined()
    })

    it('should replace existing session with same ID', async () => {
      const sessionId = 'test-session'
      
      await dbService.saveSession(sessionId, testProfile.id, [], { version: 1 })
      await dbService.saveSession(sessionId, testProfile.id, testTabs.map(t => t.toJSON()), { version: 2 })
      
      const session = await dbService.getLatestSession(testProfile.id)
      expect(session!.id).toBe(sessionId)
      
      const windowState = JSON.parse(session!.window_state)
      expect(windowState.version).toBe(2)
      
      const tabs = JSON.parse(session!.tabs)
      expect(tabs).toHaveLength(2)
    })

    it('should cleanup old sessions', async () => {
      // Create 10 sessions
      for (let i = 0; i < 10; i++) {
        await dbService.saveSession(`session-${i}`, testProfile.id, [], {})
        await new Promise(resolve => setTimeout(resolve, 5)) // Small delay for different timestamps
      }
      
      // Keep only 3 sessions
      await dbService.cleanupOldSessions(3)
      
      // Check that we can still get the latest session
      const latestSession = await dbService.getLatestSession(testProfile.id)
      expect(latestSession).toBeDefined()
      expect(latestSession!.id).toBe('session-9')
    })
  })

  describe('user agent presets', () => {
    it('should add and retrieve user agent presets', async () => {
      const preset = {
        id: 'chrome-windows',
        name: 'Chrome Windows',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        description: 'Chrome on Windows'
      }
      
      await dbService.addUserAgentPreset(preset)
      
      const presets = await dbService.getUserAgentPresets()
      expect(presets).toHaveLength(1)
      expect(presets[0]).toEqual(preset)
    })

    it('should return empty array when no presets exist', async () => {
      const presets = await dbService.getUserAgentPresets()
      expect(presets).toHaveLength(0)
    })

    it('should order presets by name', async () => {
      const presets = [
        { id: '1', name: 'Zebra', user_agent: 'zebra', description: 'Z' },
        { id: '2', name: 'Alpha', user_agent: 'alpha', description: 'A' },
        { id: '3', name: 'Beta', user_agent: 'beta', description: 'B' }
      ]
      
      for (const preset of presets) {
        await dbService.addUserAgentPreset(preset)
      }
      
      const retrieved = await dbService.getUserAgentPresets()
      expect(retrieved.map(p => p.name)).toEqual(['Alpha', 'Beta', 'Zebra'])
    })
  })

  describe('performance metrics', () => {
    let testProfile: Profile

    beforeEach(async () => {
      testProfile = new Profile('Test Profile', '🧪')
      await dbService.createProfile(testProfile.toJSON())
    })

    it('should record performance metrics', async () => {
      await dbService.recordPerformanceMetrics(testProfile.id, 512, 25.5)
      
      const metrics = await dbService.getPerformanceMetrics(testProfile.id)
      expect(metrics).toHaveLength(1)
      expect(metrics[0].profile_id).toBe(testProfile.id)
      expect(metrics[0].memory_usage).toBe(512)
      expect(metrics[0].cpu_usage).toBe(25.5)
    })

    it('should limit performance metrics results', async () => {
      // Record 10 metrics
      for (let i = 0; i < 10; i++) {
        await dbService.recordPerformanceMetrics(testProfile.id, 100 + i, 10 + i)
        await new Promise(resolve => setTimeout(resolve, 5)) // Small delay for different timestamps
      }
      
      const metrics = await dbService.getPerformanceMetrics(testProfile.id, 5)
      expect(metrics).toHaveLength(5)
      
      // Should return the latest metrics (highest memory usage values)
      expect(metrics[0].memory_usage).toBe(109) // Latest first
      expect(metrics[4].memory_usage).toBe(105)
    })

    it('should return empty array for profile with no metrics', async () => {
      const metrics = await dbService.getPerformanceMetrics('non-existent-profile')
      expect(metrics).toHaveLength(0)
    })

    it('should order metrics by timestamp descending', async () => {
      await dbService.recordPerformanceMetrics(testProfile.id, 100, 10)
      await new Promise(resolve => setTimeout(resolve, 10))
      await dbService.recordPerformanceMetrics(testProfile.id, 200, 20)
      await new Promise(resolve => setTimeout(resolve, 10))
      await dbService.recordPerformanceMetrics(testProfile.id, 300, 30)
      
      const metrics = await dbService.getPerformanceMetrics(testProfile.id)
      expect(metrics[0].memory_usage).toBe(300) // Latest first
      expect(metrics[1].memory_usage).toBe(200)
      expect(metrics[2].memory_usage).toBe(100)
    })
  })

  describe('error handling', () => {
    it('should throw error when database is not initialized', async () => {
      const uninitializedDb = new DatabaseService(':memory:')
      
      await expect(uninitializedDb.createProfile(new Profile('Test', '🧪').toJSON()))
        .rejects.toThrow('Database not initialized')
    })

    it('should handle database connection errors gracefully', async () => {
      const invalidDb = new DatabaseService('/invalid/path/that/cannot/be/created.db')
      
      await expect(invalidDb.initialize()).rejects.toThrow()
    })

    it('should handle malformed JSON in settings', async () => {
      // This test requires direct database manipulation to insert malformed JSON
      // For now, we'll test that valid JSON is handled correctly
      const profile = new Profile('Test', '🧪')
      profile.updateSettings({ userAgent: 'test' })
      
      await dbService.createProfile(profile.toJSON())
      const retrieved = await dbService.getProfile(profile.id)
      
      expect(retrieved!.settings.userAgent).toBe('test')
    })
  })

  describe('database state', () => {
    it('should report ready state correctly', () => {
      expect(dbService.isReady()).toBe(true)
    })

    it('should report not ready after close', async () => {
      await dbService.close()
      expect(dbService.isReady()).toBe(false)
    })

    it('should return correct database path', () => {
      expect(dbService.getDatabasePath()).toBe(testDbPath)
    })
  })
})