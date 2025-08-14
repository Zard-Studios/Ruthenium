import sqlite3 from 'sqlite3'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import { Profile as IProfile, ProfileSettings, Tab as ITab } from '../types'

export interface DatabaseProfile {
  id: string
  name: string
  icon: string
  created_at: string
  last_used: string
  data_path: string
  settings: string // JSON string
}

export interface DatabaseSession {
  id: string
  profile_id: string
  tabs: string // JSON string
  window_state: string // JSON string
  created_at: string
}

export interface DatabaseUserAgentPreset {
  id: string
  name: string
  user_agent: string
  description: string
}

export interface DatabasePerformanceMetric {
  id: string
  profile_id: string
  memory_usage: number
  cpu_usage: number
  timestamp: string
}

export class DatabaseService {
  private db: sqlite3.Database | null = null
  private dbPath: string
  private isInitialized = false

  constructor(dbPath?: string) {
    const baseDir = path.join(os.homedir(), '.ruthenium-browser')
    this.dbPath = dbPath || path.join(baseDir, 'ruthenium.db')
  }

  /**
   * Initialize the database connection and create tables if needed
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    // Ensure the directory exists
    const dbDir = path.dirname(this.dbPath)
    await fs.mkdir(dbDir, { recursive: true })

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to open database: ${err.message}`))
          return
        }

        // Enable foreign key constraints
        this.db!.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            reject(new Error(`Failed to enable foreign keys: ${err.message}`))
            return
          }
          
          this.createTables()
            .then(() => {
              this.isInitialized = true
              resolve()
            })
            .catch(reject)
        })
      })
    })
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (!this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(new Error(`Failed to close database: ${err.message}`))
          return
        }
        this.db = null
        this.isInitialized = false
        resolve()
      })
    })
  }

  /**
   * Create all necessary tables
   */
  private async createTables(): Promise<void> {
    const tables = [
      this.createProfilesTable(),
      this.createSessionsTable(),
      this.createUserAgentPresetsTable(),
      this.createPerformanceMetricsTable()
    ]

    await Promise.all(tables)
  }

  /**
   * Create the profiles table
   */
  private createProfilesTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME,
        data_path TEXT NOT NULL,
        settings TEXT DEFAULT '{}'
      )
    `
    return this.runQuery(sql)
  }

  /**
   * Create the profile sessions table
   */
  private createSessionsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS profile_sessions (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        tabs TEXT DEFAULT '[]',
        window_state TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `
    return this.runQuery(sql)
  }

  /**
   * Create the user agent presets table
   */
  private createUserAgentPresetsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS user_agent_presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        description TEXT
      )
    `
    return this.runQuery(sql)
  }

  /**
   * Create the performance metrics table
   */
  private createPerformanceMetricsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        memory_usage INTEGER,
        cpu_usage REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `
    return this.runQuery(sql)
  }

  /**
   * Run a SQL query that doesn't return data
   */
  private runQuery(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function(err) {
        if (err) {
          reject(new Error(`Query failed: ${err.message}`))
          return
        }
        resolve()
      })
    })
  }

  /**
   * Run a SQL query that returns a single row
   */
  private getQuery<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) {
          reject(new Error(`Query failed: ${err.message}`))
          return
        }
        resolve(row as T)
      })
    })
  }

  /**
   * Run a SQL query that returns multiple rows
   */
  private allQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) {
          reject(new Error(`Query failed: ${err.message}`))
          return
        }
        resolve(rows as T[])
      })
    })
  }

  // Profile CRUD Operations

  /**
   * Create a new profile in the database
   */
  async createProfile(profile: IProfile): Promise<void> {
    const sql = `
      INSERT INTO profiles (id, name, icon, created_at, last_used, data_path, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    const params = [
      profile.id,
      profile.name,
      profile.icon,
      profile.createdAt.toISOString(),
      profile.lastUsed.toISOString(),
      profile.dataPath,
      JSON.stringify(profile.settings)
    ]

    await this.runQuery(sql, params)
  }

  /**
   * Get a profile by ID
   */
  async getProfile(profileId: string): Promise<IProfile | undefined> {
    const sql = 'SELECT * FROM profiles WHERE id = ?'
    const row = await this.getQuery<DatabaseProfile>(sql, [profileId])
    
    if (!row) {
      return undefined
    }

    return this.convertDatabaseProfileToProfile(row)
  }

  /**
   * Get all profiles
   */
  async getAllProfiles(): Promise<IProfile[]> {
    const sql = 'SELECT * FROM profiles ORDER BY last_used DESC'
    const rows = await this.allQuery<DatabaseProfile>(sql)
    
    return rows.map(row => this.convertDatabaseProfileToProfile(row))
  }

  /**
   * Update a profile
   */
  async updateProfile(profile: IProfile): Promise<void> {
    const sql = `
      UPDATE profiles 
      SET name = ?, icon = ?, last_used = ?, settings = ?
      WHERE id = ?
    `
    const params = [
      profile.name,
      profile.icon,
      profile.lastUsed.toISOString(),
      JSON.stringify(profile.settings),
      profile.id
    ]

    await this.runQuery(sql, params)
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    const sql = 'DELETE FROM profiles WHERE id = ?'
    await this.runQuery(sql, [profileId])
  }

  /**
   * Update profile last used timestamp
   */
  async updateProfileLastUsed(profileId: string): Promise<void> {
    const sql = 'UPDATE profiles SET last_used = ? WHERE id = ?'
    await this.runQuery(sql, [new Date().toISOString(), profileId])
  }

  // Session Management

  /**
   * Save a profile session
   */
  async saveSession(sessionId: string, profileId: string, tabs: ITab[], windowState: any): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO profile_sessions (id, profile_id, tabs, window_state, created_at)
      VALUES (?, ?, ?, ?, ?)
    `
    const params = [
      sessionId,
      profileId,
      JSON.stringify(tabs),
      JSON.stringify(windowState),
      new Date().toISOString()
    ]

    await this.runQuery(sql, params)
  }

  /**
   * Get the latest session for a profile
   */
  async getLatestSession(profileId: string): Promise<DatabaseSession | undefined> {
    const sql = `
      SELECT * FROM profile_sessions 
      WHERE profile_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    return this.getQuery<DatabaseSession>(sql, [profileId])
  }

  /**
   * Delete old sessions (keep only the latest N sessions per profile)
   */
  async cleanupOldSessions(keepCount: number = 5): Promise<void> {
    const sql = `
      DELETE FROM profile_sessions 
      WHERE id NOT IN (
        SELECT id FROM profile_sessions 
        WHERE profile_id = profile_sessions.profile_id 
        ORDER BY created_at DESC 
        LIMIT ?
      )
    `
    await this.runQuery(sql, [keepCount])
  }

  // User Agent Presets

  /**
   * Get all user agent presets
   */
  async getUserAgentPresets(): Promise<DatabaseUserAgentPreset[]> {
    const sql = 'SELECT * FROM user_agent_presets ORDER BY name'
    return this.allQuery<DatabaseUserAgentPreset>(sql)
  }

  /**
   * Add a user agent preset
   */
  async addUserAgentPreset(preset: DatabaseUserAgentPreset): Promise<void> {
    const sql = `
      INSERT INTO user_agent_presets (id, name, user_agent, description)
      VALUES (?, ?, ?, ?)
    `
    const params = [preset.id, preset.name, preset.user_agent, preset.description]
    await this.runQuery(sql, params)
  }

  // Performance Metrics

  /**
   * Record performance metrics
   */
  async recordPerformanceMetrics(profileId: string, memoryUsage: number, cpuUsage: number): Promise<void> {
    const sql = `
      INSERT INTO performance_metrics (id, profile_id, memory_usage, cpu_usage, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `
    const params = [
      `${profileId}-${Date.now()}`,
      profileId,
      memoryUsage,
      cpuUsage,
      new Date().toISOString()
    ]
    await this.runQuery(sql, params)
  }

  /**
   * Get performance metrics for a profile
   */
  async getPerformanceMetrics(profileId: string, limit: number = 100): Promise<DatabasePerformanceMetric[]> {
    const sql = `
      SELECT * FROM performance_metrics 
      WHERE profile_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `
    return this.allQuery<DatabasePerformanceMetric>(sql, [profileId, limit])
  }

  /**
   * Convert database profile row to Profile interface
   */
  private convertDatabaseProfileToProfile(row: DatabaseProfile): IProfile {
    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
      createdAt: new Date(row.created_at),
      lastUsed: new Date(row.last_used),
      dataPath: row.data_path,
      settings: JSON.parse(row.settings) as ProfileSettings,
      tabs: [] // Tabs are managed separately
    }
  }

  /**
   * Check if database is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.db !== null
  }

  /**
   * Get database path
   */
  getDatabasePath(): string {
    return this.dbPath
  }
}