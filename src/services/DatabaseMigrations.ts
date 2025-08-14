import { DatabaseService } from './DatabaseService'

export interface Migration {
  version: number
  description: string
  up: (db: DatabaseService) => Promise<void>
  down: (db: DatabaseService) => Promise<void>
}

export class DatabaseMigrationService {
  private db: DatabaseService
  private migrations: Migration[] = []

  constructor(db: DatabaseService) {
    this.db = db
    this.initializeMigrations()
  }

  /**
   * Initialize all migrations
   */
  private initializeMigrations(): void {
    this.migrations = [
      {
        version: 1,
        description: 'Initial schema creation',
        up: async (db: DatabaseService) => {
          // This is handled by the main DatabaseService initialization
          // This migration exists for version tracking
        },
        down: async (db: DatabaseService) => {
          // Drop all tables
          await (db as any).runQuery('DROP TABLE IF EXISTS performance_metrics')
          await (db as any).runQuery('DROP TABLE IF EXISTS user_agent_presets')
          await (db as any).runQuery('DROP TABLE IF EXISTS profile_sessions')
          await (db as any).runQuery('DROP TABLE IF EXISTS profiles')
          await (db as any).runQuery('DROP TABLE IF EXISTS schema_migrations')
        }
      },
      {
        version: 2,
        description: 'Add indexes for better performance',
        up: async (db: DatabaseService) => {
          await (db as any).runQuery('CREATE INDEX IF NOT EXISTS idx_profiles_last_used ON profiles(last_used)')
          await (db as any).runQuery('CREATE INDEX IF NOT EXISTS idx_sessions_profile_id ON profile_sessions(profile_id)')
          await (db as any).runQuery('CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON profile_sessions(created_at)')
          await (db as any).runQuery('CREATE INDEX IF NOT EXISTS idx_metrics_profile_id ON performance_metrics(profile_id)')
          await (db as any).runQuery('CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON performance_metrics(timestamp)')
        },
        down: async (db: DatabaseService) => {
          await (db as any).runQuery('DROP INDEX IF EXISTS idx_profiles_last_used')
          await (db as any).runQuery('DROP INDEX IF EXISTS idx_sessions_profile_id')
          await (db as any).runQuery('DROP INDEX IF EXISTS idx_sessions_created_at')
          await (db as any).runQuery('DROP INDEX IF EXISTS idx_metrics_profile_id')
          await (db as any).runQuery('DROP INDEX IF EXISTS idx_metrics_timestamp')
        }
      },
      {
        version: 3,
        description: 'Add extension support tables',
        up: async (db: DatabaseService) => {
          // Extensions table
          await (db as any).runQuery(`
            CREATE TABLE IF NOT EXISTS extensions (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              version TEXT NOT NULL,
              description TEXT,
              author TEXT,
              manifest_version INTEGER NOT NULL,
              permissions TEXT, -- JSON array
              icons TEXT, -- JSON object
              is_enabled INTEGER DEFAULT 1,
              install_date DATETIME DEFAULT CURRENT_TIMESTAMP,
              update_date DATETIME,
              profile_id TEXT, -- NULL for global extensions
              manifest_data TEXT, -- Full manifest JSON
              FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
            )
          `)

          // Profile extension states table
          await (db as any).runQuery(`
            CREATE TABLE IF NOT EXISTS profile_extension_states (
              profile_id TEXT NOT NULL,
              extension_id TEXT NOT NULL,
              is_enabled INTEGER DEFAULT 1,
              settings TEXT, -- JSON object for extension settings
              permissions TEXT, -- JSON array of granted permissions
              last_used DATETIME,
              PRIMARY KEY (profile_id, extension_id),
              FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
              FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE
            )
          `)

          // Extension storage table (for WebExtension storage API)
          await (db as any).runQuery(`
            CREATE TABLE IF NOT EXISTS extension_storage (
              profile_id TEXT NOT NULL,
              extension_id TEXT NOT NULL,
              storage_type TEXT NOT NULL, -- 'local' or 'sync'
              key TEXT NOT NULL,
              value TEXT, -- JSON value
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (profile_id, extension_id, storage_type, key),
              FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
              FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE
            )
          `)

          // Create indexes for extension tables
          await (db as any).runQuery('CREATE INDEX IF NOT EXISTS idx_extensions_profile_id ON extensions(profile_id)')
          await (db as any).runQuery('CREATE INDEX IF NOT EXISTS idx_extensions_name ON extensions(name)')
          await (db as any).runQuery('CREATE INDEX IF NOT EXISTS idx_profile_extension_states_profile_id ON profile_extension_states(profile_id)')
          await (db as any).runQuery('CREATE INDEX IF NOT EXISTS idx_profile_extension_states_extension_id ON profile_extension_states(extension_id)')
          await (db as any).runQuery('CREATE INDEX IF NOT EXISTS idx_extension_storage_profile_extension ON extension_storage(profile_id, extension_id)')
        },
        down: async (db: DatabaseService) => {
          await (db as any).runQuery('DROP INDEX IF EXISTS idx_extensions_profile_id')
          await (db as any).runQuery('DROP INDEX IF EXISTS idx_extensions_name')
          await (db as any).runQuery('DROP INDEX IF EXISTS idx_profile_extension_states_profile_id')
          await (db as any).runQuery('DROP INDEX IF EXISTS idx_profile_extension_states_extension_id')
          await (db as any).runQuery('DROP INDEX IF EXISTS idx_extension_storage_profile_extension')
          await (db as any).runQuery('DROP TABLE IF EXISTS extension_storage')
          await (db as any).runQuery('DROP TABLE IF EXISTS profile_extension_states')
          await (db as any).runQuery('DROP TABLE IF EXISTS extensions')
        }
      }
    ]
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    await this.createMigrationsTable()
    
    const currentVersion = await this.getCurrentVersion()
    const pendingMigrations = this.migrations.filter(m => m.version > currentVersion)

    for (const migration of pendingMigrations) {
      console.log(`Running migration ${migration.version}: ${migration.description}`)
      
      try {
        await migration.up(this.db)
        await this.recordMigration(migration.version, migration.description)
        console.log(`Migration ${migration.version} completed successfully`)
      } catch (error) {
        console.error(`Migration ${migration.version} failed:`, error)
        throw new Error(`Migration ${migration.version} failed: ${error}`)
      }
    }

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations')
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollback(targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion()
    
    if (targetVersion >= currentVersion) {
      throw new Error(`Target version ${targetVersion} is not less than current version ${currentVersion}`)
    }

    const migrationsToRollback = this.migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version) // Rollback in reverse order

    for (const migration of migrationsToRollback) {
      console.log(`Rolling back migration ${migration.version}: ${migration.description}`)
      
      try {
        await migration.down(this.db)
        await this.removeMigrationRecord(migration.version)
        console.log(`Migration ${migration.version} rolled back successfully`)
      } catch (error) {
        console.error(`Rollback of migration ${migration.version} failed:`, error)
        throw new Error(`Rollback of migration ${migration.version} failed: ${error}`)
      }
    }
  }

  /**
   * Get the current database version
   */
  async getCurrentVersion(): Promise<number> {
    try {
      const result = await (this.db as any).getQuery<{ version: number }>(
        'SELECT MAX(version) as version FROM schema_migrations'
      )
      return result?.version || 0
    } catch (error) {
      // If the table doesn't exist, we're at version 0
      return 0
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{ version: number; description: string; applied_at: string }[]> {
    try {
      return await (this.db as any).allQuery<{ version: number; description: string; applied_at: string }>(
        'SELECT version, description, applied_at FROM schema_migrations ORDER BY version'
      )
    } catch (error) {
      return []
    }
  }

  /**
   * Create the schema migrations table
   */
  private async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    await (this.db as any).runQuery(sql)
  }

  /**
   * Record a completed migration
   */
  private async recordMigration(version: number, description: string): Promise<void> {
    const sql = `
      INSERT INTO schema_migrations (version, description, applied_at)
      VALUES (?, ?, ?)
    `
    await (this.db as any).runQuery(sql, [version, description, new Date().toISOString()])
  }

  /**
   * Remove a migration record (for rollbacks)
   */
  private async removeMigrationRecord(version: number): Promise<void> {
    const sql = 'DELETE FROM schema_migrations WHERE version = ?'
    await (this.db as any).runQuery(sql, [version])
  }

  /**
   * Check if database needs migration
   */
  async needsMigration(): Promise<boolean> {
    const currentVersion = await this.getCurrentVersion()
    const latestVersion = Math.max(...this.migrations.map(m => m.version))
    return currentVersion < latestVersion
  }

  /**
   * Get available migrations
   */
  getAvailableMigrations(): Migration[] {
    return [...this.migrations]
  }

  /**
   * Validate migration integrity
   */
  async validateMigrations(): Promise<boolean> {
    try {
      const appliedMigrations = await this.getMigrationStatus()
      const appliedVersions = appliedMigrations.map(m => m.version)
      
      // Check for gaps in migration versions
      for (let i = 1; i <= Math.max(...appliedVersions); i++) {
        if (!appliedVersions.includes(i)) {
          console.error(`Missing migration version ${i}`)
          return false
        }
      }

      // Check if all applied migrations exist in code
      for (const appliedVersion of appliedVersions) {
        const migration = this.migrations.find(m => m.version === appliedVersion)
        if (!migration) {
          console.error(`Applied migration ${appliedVersion} not found in code`)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Migration validation failed:', error)
      return false
    }
  }
}