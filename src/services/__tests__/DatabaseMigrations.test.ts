import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseService } from '../DatabaseService'
import { DatabaseMigrationService } from '../DatabaseMigrations'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('DatabaseMigrationService', () => {
  let dbService: DatabaseService
  let migrationService: DatabaseMigrationService
  let testDbPath: string

  beforeEach(async () => {
    // Create a temporary database file for testing
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ruthenium-migration-test-'))
    testDbPath = path.join(tempDir, 'test.db')
    dbService = new DatabaseService(testDbPath)
    await dbService.initialize()
    migrationService = new DatabaseMigrationService(dbService)
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
    it('should initialize with available migrations', () => {
      const migrations = migrationService.getAvailableMigrations()
      expect(migrations.length).toBeGreaterThan(0)
      expect(migrations[0].version).toBe(1)
      expect(migrations[0].description).toBe('Initial schema creation')
    })
  })

  describe('migration execution', () => {
    it('should run pending migrations', async () => {
      const initialVersion = await migrationService.getCurrentVersion()
      expect(initialVersion).toBe(0)
      
      await migrationService.migrate()
      
      const finalVersion = await migrationService.getCurrentVersion()
      expect(finalVersion).toBeGreaterThan(0)
    })

    it('should not run migrations twice', async () => {
      await migrationService.migrate()
      const versionAfterFirst = await migrationService.getCurrentVersion()
      
      await migrationService.migrate()
      const versionAfterSecond = await migrationService.getCurrentVersion()
      
      expect(versionAfterFirst).toBe(versionAfterSecond)
    })

    it('should record migration status', async () => {
      await migrationService.migrate()
      
      const status = await migrationService.getMigrationStatus()
      expect(status.length).toBeGreaterThan(0)
      expect(status[0].version).toBe(1)
      expect(status[0].description).toBe('Initial schema creation')
      expect(status[0].applied_at).toBeDefined()
    })

    it('should detect when migration is needed', async () => {
      const needsBefore = await migrationService.needsMigration()
      expect(needsBefore).toBe(true)
      
      await migrationService.migrate()
      
      const needsAfter = await migrationService.needsMigration()
      expect(needsAfter).toBe(false)
    })
  })

  describe('rollback functionality', () => {
    beforeEach(async () => {
      // Run all migrations first
      await migrationService.migrate()
    })

    it('should rollback to a specific version', async () => {
      const currentVersion = await migrationService.getCurrentVersion()
      expect(currentVersion).toBeGreaterThan(1)
      
      await migrationService.rollback(1)
      
      const newVersion = await migrationService.getCurrentVersion()
      expect(newVersion).toBe(1)
    })

    it('should throw error when rolling back to higher version', async () => {
      const currentVersion = await migrationService.getCurrentVersion()
      
      await expect(migrationService.rollback(currentVersion + 1))
        .rejects.toThrow('Target version')
    })

    it('should throw error when rolling back to same version', async () => {
      const currentVersion = await migrationService.getCurrentVersion()
      
      await expect(migrationService.rollback(currentVersion))
        .rejects.toThrow('Target version')
    })

    it('should update migration status after rollback', async () => {
      await migrationService.rollback(1)
      
      const status = await migrationService.getMigrationStatus()
      expect(status.length).toBe(1)
      expect(status[0].version).toBe(1)
    })
  })

  describe('migration validation', () => {
    it('should validate migrations successfully after running them', async () => {
      await migrationService.migrate()
      
      const isValid = await migrationService.validateMigrations()
      expect(isValid).toBe(true)
    })

    it('should validate migrations on fresh database', async () => {
      const isValid = await migrationService.validateMigrations()
      expect(isValid).toBe(true) // No migrations applied yet, so validation should pass
    })
  })

  describe('version management', () => {
    it('should return version 0 for fresh database', async () => {
      const version = await migrationService.getCurrentVersion()
      expect(version).toBe(0)
    })

    it('should track version correctly after migrations', async () => {
      await migrationService.migrate()
      
      const version = await migrationService.getCurrentVersion()
      const availableMigrations = migrationService.getAvailableMigrations()
      const maxVersion = Math.max(...availableMigrations.map(m => m.version))
      
      expect(version).toBe(maxVersion)
    })

    it('should return empty status for fresh database', async () => {
      const status = await migrationService.getMigrationStatus()
      expect(status).toEqual([])
    })
  })

  describe('error handling', () => {
    it('should handle database errors during migration', async () => {
      // Close the database to simulate an error
      await dbService.close()
      
      await expect(migrationService.migrate())
        .rejects.toThrow()
    })

    it('should handle database errors during rollback', async () => {
      await migrationService.migrate()
      await dbService.close()
      
      await expect(migrationService.rollback(1))
        .rejects.toThrow()
    })

    it('should handle database errors during version check', async () => {
      await dbService.close()
      
      // getCurrentVersion has error handling that returns 0 when database is closed
      const version = await migrationService.getCurrentVersion()
      expect(version).toBe(0)
    })
  })

  describe('migration content verification', () => {
    it('should have proper migration structure', () => {
      const migrations = migrationService.getAvailableMigrations()
      
      for (const migration of migrations) {
        expect(migration.version).toBeTypeOf('number')
        expect(migration.description).toBeTypeOf('string')
        expect(migration.up).toBeTypeOf('function')
        expect(migration.down).toBeTypeOf('function')
        expect(migration.version).toBeGreaterThan(0)
        expect(migration.description.length).toBeGreaterThan(0)
      }
    })

    it('should have sequential version numbers', () => {
      const migrations = migrationService.getAvailableMigrations()
      const versions = migrations.map(m => m.version).sort((a, b) => a - b)
      
      for (let i = 0; i < versions.length; i++) {
        expect(versions[i]).toBe(i + 1)
      }
    })

    it('should have unique version numbers', () => {
      const migrations = migrationService.getAvailableMigrations()
      const versions = migrations.map(m => m.version)
      const uniqueVersions = [...new Set(versions)]
      
      expect(versions.length).toBe(uniqueVersions.length)
    })
  })
})