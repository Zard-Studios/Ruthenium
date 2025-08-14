import { Extension, ExtensionManifest, ExtensionInstallOptions, ExtensionState } from '../types/extension'
import { DatabaseService } from './DatabaseService'
import { ProfileManager } from './ProfileManager'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'

export class ExtensionManager {
  private databaseService: DatabaseService
  private profileManager: ProfileManager
  private extensionsPath: string
  private installedExtensions: Map<string, Extension> = new Map()
  private profileExtensionStates: Map<string, Map<string, ExtensionState>> = new Map()

  constructor(databaseService: DatabaseService, profileManager: ProfileManager) {
    this.databaseService = databaseService
    this.profileManager = profileManager
    this.extensionsPath = path.join(process.cwd(), 'extensions')
  }

  async initialize(): Promise<void> {
    // Ensure extensions directory exists
    try {
      await fs.mkdir(this.extensionsPath, { recursive: true })
    } catch (error) {
      console.error('Failed to create extensions directory:', error)
    }

    // Load installed extensions from database
    await this.loadInstalledExtensions()
    
    // Load per-profile extension states
    await this.loadProfileExtensionStates()
  }

  async installExtension(
    extensionPath: string, 
    options: ExtensionInstallOptions = { source: 'local', autoEnable: true }
  ): Promise<Extension> {
    try {
      // Read and validate manifest
      const manifestPath = path.join(extensionPath, 'manifest.json')
      const manifestContent = await fs.readFile(manifestPath, 'utf-8')
      const manifest: ExtensionManifest = JSON.parse(manifestContent)

      // Validate manifest
      this.validateManifest(manifest)

      // Generate unique extension ID
      const extensionId = this.generateExtensionId(manifest.name, manifest.version)

      // Create extension object
      const extension: Extension = {
        id: extensionId,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description || '',
        author: manifest.author || 'Unknown',
        manifestVersion: manifest.manifest_version,
        permissions: manifest.permissions || [],
        icons: manifest.icons || {},
        isEnabled: options.autoEnable || false,
        installDate: new Date(),
        profileId: options.profileId
      }

      // Copy extension files to extensions directory
      const targetPath = path.join(this.extensionsPath, extensionId)
      await this.copyExtensionFiles(extensionPath, targetPath)

      // Store in database
      await this.saveExtensionToDatabase(extension, manifest)

      // Add to memory cache
      this.installedExtensions.set(extensionId, extension)

      // If profile-specific, create extension state
      if (options.profileId) {
        await this.createProfileExtensionState(options.profileId, extensionId, {
          isEnabled: options.autoEnable || false,
          settings: {},
          permissions: manifest.permissions || []
        })
      }

      return extension
    } catch (error) {
      throw new Error(`Failed to install extension: ${error.message}`)
    }
  }

  async uninstallExtension(extensionId: string, profileId?: string): Promise<void> {
    const extension = this.installedExtensions.get(extensionId)
    if (!extension) {
      throw new Error(`Extension ${extensionId} not found`)
    }

    try {
      // If profile-specific uninstall
      if (profileId) {
        await this.removeProfileExtensionState(profileId, extensionId)
        
        // Check if extension is used by other profiles
        const otherProfilesUsingExtension = await this.getProfilesUsingExtension(extensionId)
        if (otherProfilesUsingExtension.length > 0) {
          return // Don't remove extension files if other profiles use it
        }
      }

      // Remove extension files
      const extensionPath = path.join(this.extensionsPath, extensionId)
      await fs.rm(extensionPath, { recursive: true, force: true })

      // Remove from database
      await this.removeExtensionFromDatabase(extensionId)

      // Remove from memory cache
      this.installedExtensions.delete(extensionId)

      // Remove all profile states for this extension
      for (const [profileId, states] of this.profileExtensionStates) {
        states.delete(extensionId)
      }
    } catch (error) {
      throw new Error(`Failed to uninstall extension: ${error.message}`)
    }
  }

  async enableExtensionForProfile(profileId: string, extensionId: string): Promise<void> {
    const extension = this.installedExtensions.get(extensionId)
    if (!extension) {
      throw new Error(`Extension ${extensionId} not found`)
    }

    await this.updateProfileExtensionState(profileId, extensionId, { isEnabled: true })
  }

  async disableExtensionForProfile(profileId: string, extensionId: string): Promise<void> {
    const extension = this.installedExtensions.get(extensionId)
    if (!extension) {
      throw new Error(`Extension ${extensionId} not found`)
    }

    await this.updateProfileExtensionState(profileId, extensionId, { isEnabled: false })
  }

  async getExtensionsForProfile(profileId: string): Promise<Extension[]> {
    const profileStates = this.profileExtensionStates.get(profileId) || new Map()
    const extensions: Extension[] = []

    for (const [extensionId, state] of profileStates) {
      const extension = this.installedExtensions.get(extensionId)
      if (extension) {
        extensions.push({
          ...extension,
          isEnabled: state.isEnabled
        })
      }
    }

    return extensions
  }

  async getExtensionState(profileId: string, extensionId: string): Promise<ExtensionState | null> {
    const profileStates = this.profileExtensionStates.get(profileId)
    return profileStates?.get(extensionId) || null
  }

  getAllExtensions(): Extension[] {
    return Array.from(this.installedExtensions.values())
  }

  private validateManifest(manifest: ExtensionManifest): void {
    if (!manifest.manifest_version || ![2, 3].includes(manifest.manifest_version)) {
      throw new Error('Invalid or unsupported manifest version')
    }

    if (!manifest.name || !manifest.version) {
      throw new Error('Extension name and version are required')
    }

    // Validate permissions
    if (manifest.permissions) {
      const allowedPermissions = [
        'tabs', 'storage', 'activeTab', 'cookies', 'history',
        'bookmarks', 'notifications', 'contextMenus', 'webRequest'
      ]
      
      for (const permission of manifest.permissions) {
        if (!allowedPermissions.includes(permission) && !permission.startsWith('http')) {
          console.warn(`Unknown permission: ${permission}`)
        }
      }
    }
  }

  private generateExtensionId(name: string, version: string): string {
    const hash = crypto.createHash('sha256')
    hash.update(`${name}-${version}-${Date.now()}`)
    return hash.digest('hex').substring(0, 32)
  }

  private async copyExtensionFiles(sourcePath: string, targetPath: string): Promise<void> {
    await fs.mkdir(targetPath, { recursive: true })
    
    const entries = await fs.readdir(sourcePath, { withFileTypes: true })
    
    for (const entry of entries) {
      const srcPath = path.join(sourcePath, entry.name)
      const destPath = path.join(targetPath, entry.name)
      
      if (entry.isDirectory()) {
        await this.copyExtensionFiles(srcPath, destPath)
      } else {
        await fs.copyFile(srcPath, destPath)
      }
    }
  }

  private async saveExtensionToDatabase(extension: Extension, manifest: ExtensionManifest): Promise<void> {
    const db = await this.databaseService.getDatabase()
    
    await db.run(`
      INSERT OR REPLACE INTO extensions (
        id, name, version, description, author, manifest_version,
        permissions, icons, is_enabled, install_date, update_date,
        profile_id, manifest_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      extension.id,
      extension.name,
      extension.version,
      extension.description,
      extension.author,
      extension.manifestVersion,
      JSON.stringify(extension.permissions),
      JSON.stringify(extension.icons),
      extension.isEnabled ? 1 : 0,
      extension.installDate.toISOString(),
      extension.updateDate?.toISOString(),
      extension.profileId,
      JSON.stringify(manifest)
    ])
  }

  private async removeExtensionFromDatabase(extensionId: string): Promise<void> {
    const db = await this.databaseService.getDatabase()
    await db.run('DELETE FROM extensions WHERE id = ?', [extensionId])
  }

  private async loadInstalledExtensions(): Promise<void> {
    const db = await this.databaseService.getDatabase()
    const rows = await db.all('SELECT * FROM extensions')
    
    for (const row of rows) {
      const extension: Extension = {
        id: row.id,
        name: row.name,
        version: row.version,
        description: row.description,
        author: row.author,
        manifestVersion: row.manifest_version,
        permissions: JSON.parse(row.permissions || '[]'),
        icons: JSON.parse(row.icons || '{}'),
        isEnabled: row.is_enabled === 1,
        installDate: new Date(row.install_date),
        updateDate: row.update_date ? new Date(row.update_date) : undefined,
        profileId: row.profile_id
      }
      
      this.installedExtensions.set(extension.id, extension)
    }
  }

  private async loadProfileExtensionStates(): Promise<void> {
    const db = await this.databaseService.getDatabase()
    const rows = await db.all('SELECT * FROM profile_extension_states')
    
    for (const row of rows) {
      const state: ExtensionState = {
        extensionId: row.extension_id,
        profileId: row.profile_id,
        isEnabled: row.is_enabled === 1,
        settings: JSON.parse(row.settings || '{}'),
        permissions: JSON.parse(row.permissions || '[]'),
        lastUsed: row.last_used ? new Date(row.last_used) : undefined
      }
      
      if (!this.profileExtensionStates.has(row.profile_id)) {
        this.profileExtensionStates.set(row.profile_id, new Map())
      }
      
      this.profileExtensionStates.get(row.profile_id)!.set(row.extension_id, state)
    }
  }

  private async createProfileExtensionState(
    profileId: string, 
    extensionId: string, 
    options: { isEnabled: boolean; settings: Record<string, any>; permissions: string[] }
  ): Promise<void> {
    const state: ExtensionState = {
      extensionId,
      profileId,
      isEnabled: options.isEnabled,
      settings: options.settings,
      permissions: options.permissions
    }

    // Save to database
    const db = await this.databaseService.getDatabase()
    await db.run(`
      INSERT OR REPLACE INTO profile_extension_states (
        profile_id, extension_id, is_enabled, settings, permissions, last_used
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      profileId,
      extensionId,
      options.isEnabled ? 1 : 0,
      JSON.stringify(options.settings),
      JSON.stringify(options.permissions),
      null
    ])

    // Update memory cache
    if (!this.profileExtensionStates.has(profileId)) {
      this.profileExtensionStates.set(profileId, new Map())
    }
    this.profileExtensionStates.get(profileId)!.set(extensionId, state)
  }

  private async updateProfileExtensionState(
    profileId: string, 
    extensionId: string, 
    updates: Partial<ExtensionState>
  ): Promise<void> {
    const profileStates = this.profileExtensionStates.get(profileId)
    const currentState = profileStates?.get(extensionId)
    
    if (!currentState) {
      throw new Error(`Extension state not found for profile ${profileId} and extension ${extensionId}`)
    }

    const updatedState = { ...currentState, ...updates }

    // Update database
    const db = await this.databaseService.getDatabase()
    await db.run(`
      UPDATE profile_extension_states 
      SET is_enabled = ?, settings = ?, permissions = ?, last_used = ?
      WHERE profile_id = ? AND extension_id = ?
    `, [
      updatedState.isEnabled ? 1 : 0,
      JSON.stringify(updatedState.settings),
      JSON.stringify(updatedState.permissions),
      updatedState.lastUsed?.toISOString(),
      profileId,
      extensionId
    ])

    // Update memory cache
    profileStates!.set(extensionId, updatedState)
  }

  private async removeProfileExtensionState(profileId: string, extensionId: string): Promise<void> {
    const db = await this.databaseService.getDatabase()
    await db.run(
      'DELETE FROM profile_extension_states WHERE profile_id = ? AND extension_id = ?',
      [profileId, extensionId]
    )

    // Update memory cache
    const profileStates = this.profileExtensionStates.get(profileId)
    profileStates?.delete(extensionId)
  }

  private async getProfilesUsingExtension(extensionId: string): Promise<string[]> {
    const db = await this.databaseService.getDatabase()
    const rows = await db.all(
      'SELECT DISTINCT profile_id FROM profile_extension_states WHERE extension_id = ?',
      [extensionId]
    )
    return rows.map(row => row.profile_id)
  }
}