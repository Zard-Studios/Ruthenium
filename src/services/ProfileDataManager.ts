import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { Profile } from '../types'
import { ImportResult, ImportedBookmark, ImportedHistoryEntry, ImportedPassword } from './FirefoxDataImporter'

export interface ProfileDataPaths {
  root: string
  cache: string
  cookies: string
  localStorage: string
  sessionStorage: string
  downloads: string
  extensions: string
  logs: string
  bookmarks: string
  history: string
  passwords: string
}

export class ProfileDataManager {
  private static readonly APP_DATA_DIR = app.getPath('userData')
  private static readonly PROFILES_DIR = join(ProfileDataManager.APP_DATA_DIR, 'profiles')

  /**
   * Create all necessary directories for a profile
   */
  static async createProfileDirectories(profile: Profile): Promise<ProfileDataPaths> {
    const profileRoot = join(this.PROFILES_DIR, profile.id)
    
    const paths: ProfileDataPaths = {
      root: profileRoot,
      cache: join(profileRoot, 'cache'),
      cookies: join(profileRoot, 'cookies'),
      localStorage: join(profileRoot, 'localStorage'),
      sessionStorage: join(profileRoot, 'sessionStorage'),
      downloads: join(profileRoot, 'downloads'),
      extensions: join(profileRoot, 'extensions'),
      logs: join(profileRoot, 'logs'),
      bookmarks: join(profileRoot, 'bookmarks'),
      history: join(profileRoot, 'history'),
      passwords: join(profileRoot, 'passwords')
    }

    // Create all directories
    for (const path of Object.values(paths)) {
      await fs.mkdir(path, { recursive: true })
    }

    // Create profile metadata file
    const metadataPath = join(profileRoot, 'profile.json')
    const metadata = {
      id: profile.id,
      name: profile.name,
      createdAt: profile.createdAt.toISOString(),
      version: '1.0.0'
    }
    
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))

    return paths
  }

  /**
   * Get profile data paths (create directories if they don't exist)
   */
  static async getProfilePaths(profileId: string): Promise<ProfileDataPaths> {
    const profileRoot = join(this.PROFILES_DIR, profileId)
    
    const paths: ProfileDataPaths = {
      root: profileRoot,
      cache: join(profileRoot, 'cache'),
      cookies: join(profileRoot, 'cookies'),
      localStorage: join(profileRoot, 'localStorage'),
      sessionStorage: join(profileRoot, 'sessionStorage'),
      downloads: join(profileRoot, 'downloads'),
      extensions: join(profileRoot, 'extensions'),
      logs: join(profileRoot, 'logs'),
      bookmarks: join(profileRoot, 'bookmarks'),
      history: join(profileRoot, 'history'),
      passwords: join(profileRoot, 'passwords')
    }

    // Ensure all directories exist
    for (const path of Object.values(paths)) {
      await fs.mkdir(path, { recursive: true })
    }

    return paths
  }

  /**
   * Delete all data for a profile
   */
  static async deleteProfileData(profileId: string): Promise<void> {
    const profileRoot = join(this.PROFILES_DIR, profileId)
    
    try {
      await fs.rm(profileRoot, { recursive: true, force: true })
    } catch (error) {
      console.error(`Failed to delete profile data for ${profileId}:`, error)
      throw error
    }
  }

  /**
   * Clear specific data types for a profile
   */
  static async clearProfileData(profileId: string, dataTypes: {
    cache?: boolean
    cookies?: boolean
    localStorage?: boolean
    sessionStorage?: boolean
    downloads?: boolean
    bookmarks?: boolean
    history?: boolean
    passwords?: boolean
  }): Promise<void> {
    const paths = await this.getProfilePaths(profileId)

    const clearOperations: Promise<void>[] = []

    if (dataTypes.cache) {
      clearOperations.push(this.clearDirectory(paths.cache))
    }

    if (dataTypes.cookies) {
      clearOperations.push(this.clearDirectory(paths.cookies))
    }

    if (dataTypes.localStorage) {
      clearOperations.push(this.clearDirectory(paths.localStorage))
    }

    if (dataTypes.sessionStorage) {
      clearOperations.push(this.clearDirectory(paths.sessionStorage))
    }

    if (dataTypes.downloads) {
      clearOperations.push(this.clearDirectory(paths.downloads))
    }

    if (dataTypes.bookmarks) {
      clearOperations.push(this.clearDirectory(paths.bookmarks))
    }

    if (dataTypes.history) {
      clearOperations.push(this.clearDirectory(paths.history))
    }

    if (dataTypes.passwords) {
      clearOperations.push(this.clearDirectory(paths.passwords))
    }

    await Promise.all(clearOperations)
  }

  /**
   * Get profile data size in bytes
   */
  static async getProfileDataSize(profileId: string): Promise<number> {
    const paths = await this.getProfilePaths(profileId)
    
    let totalSize = 0
    
    for (const path of Object.values(paths)) {
      totalSize += await this.getDirectorySize(path)
    }

    return totalSize
  }

  /**
   * Create a backup of profile data
   */
  static async createProfileBackup(profileId: string, backupPath: string): Promise<void> {
    const profileRoot = join(this.PROFILES_DIR, profileId)
    
    // Create backup directory
    await fs.mkdir(backupPath, { recursive: true })
    
    // Copy profile data to backup location
    await this.copyDirectory(profileRoot, join(backupPath, profileId))
  }

  /**
   * Restore profile data from backup
   */
  static async restoreProfileBackup(profileId: string, backupPath: string): Promise<void> {
    const profileRoot = join(this.PROFILES_DIR, profileId)
    const backupProfilePath = join(backupPath, profileId)
    
    // Remove existing profile data
    await fs.rm(profileRoot, { recursive: true, force: true })
    
    // Copy backup data to profile location
    await this.copyDirectory(backupProfilePath, profileRoot)
  }

  /**
   * Verify data isolation between profiles
   */
  static async verifyDataIsolation(profileId1: string, profileId2: string): Promise<boolean> {
    const paths1 = await this.getProfilePaths(profileId1)
    const paths2 = await this.getProfilePaths(profileId2)

    // Check that profile directories are completely separate
    return paths1.root !== paths2.root && 
           !paths1.root.startsWith(paths2.root) && 
           !paths2.root.startsWith(paths1.root)
  }

  /**
   * Import Firefox data into a Ruthenium profile
   */
  static async importFirefoxData(profileId: string, importResult: ImportResult): Promise<void> {
    const paths = await this.getProfilePaths(profileId)

    // Import bookmarks
    if (importResult.bookmarks.length > 0) {
      await this.saveBookmarks(paths.bookmarks, importResult.bookmarks)
    }

    // Import history
    if (importResult.history.length > 0) {
      await this.saveHistory(paths.history, importResult.history)
    }

    // Import passwords
    if (importResult.passwords.length > 0) {
      await this.savePasswords(paths.passwords, importResult.passwords)
    }

    // Save import metadata
    const importMetadata = {
      importedAt: new Date().toISOString(),
      source: 'firefox',
      stats: importResult.stats,
      settings: importResult.settings
    }

    await fs.writeFile(
      join(paths.root, 'import-metadata.json'),
      JSON.stringify(importMetadata, null, 2)
    )
  }

  /**
   * Save bookmarks to profile directory
   */
  private static async saveBookmarks(bookmarksPath: string, bookmarks: ImportedBookmark[]): Promise<void> {
    await fs.mkdir(bookmarksPath, { recursive: true })
    
    const bookmarksFile = join(bookmarksPath, 'bookmarks.json')
    await fs.writeFile(bookmarksFile, JSON.stringify(bookmarks, null, 2))

    // Create a flat index for quick searching
    const flatBookmarks = this.flattenBookmarks(bookmarks)
    const indexFile = join(bookmarksPath, 'bookmarks-index.json')
    await fs.writeFile(indexFile, JSON.stringify(flatBookmarks, null, 2))
  }

  /**
   * Save browsing history to profile directory
   */
  private static async saveHistory(historyPath: string, history: ImportedHistoryEntry[]): Promise<void> {
    await fs.mkdir(historyPath, { recursive: true })
    
    // Split history into chunks for better performance
    const chunkSize = 1000
    const chunks = []
    
    for (let i = 0; i < history.length; i += chunkSize) {
      chunks.push(history.slice(i, i + chunkSize))
    }

    // Save each chunk as a separate file
    for (let i = 0; i < chunks.length; i++) {
      const chunkFile = join(historyPath, `history-${i.toString().padStart(3, '0')}.json`)
      await fs.writeFile(chunkFile, JSON.stringify(chunks[i], null, 2))
    }

    // Create history index
    const historyIndex = {
      totalEntries: history.length,
      chunks: chunks.length,
      lastUpdated: new Date().toISOString(),
      domains: [...new Set(history.map(entry => new URL(entry.url).hostname))].sort()
    }

    const indexFile = join(historyPath, 'history-index.json')
    await fs.writeFile(indexFile, JSON.stringify(historyIndex, null, 2))
  }

  /**
   * Save encrypted passwords to profile directory
   */
  private static async savePasswords(passwordsPath: string, passwords: ImportedPassword[]): Promise<void> {
    await fs.mkdir(passwordsPath, { recursive: true })
    
    const passwordsFile = join(passwordsPath, 'passwords.json')
    await fs.writeFile(passwordsFile, JSON.stringify(passwords, null, 2))

    // Create password index (without sensitive data)
    const passwordIndex = passwords.map(pwd => ({
      id: pwd.id,
      hostname: pwd.hostname,
      username: pwd.username,
      timeCreated: pwd.timeCreated,
      timeLastUsed: pwd.timeLastUsed,
      timesUsed: pwd.timesUsed
    }))

    const indexFile = join(passwordsPath, 'passwords-index.json')
    await fs.writeFile(indexFile, JSON.stringify(passwordIndex, null, 2))
  }

  /**
   * Flatten hierarchical bookmarks for indexing
   */
  private static flattenBookmarks(bookmarks: ImportedBookmark[]): ImportedBookmark[] {
    const flat: ImportedBookmark[] = []
    
    const flatten = (items: ImportedBookmark[], parentPath = '') => {
      for (const item of items) {
        const currentPath = parentPath ? `${parentPath}/${item.title}` : item.title
        
        flat.push({
          ...item,
          // Add path for easier searching
          path: currentPath,
          children: undefined // Remove children from flat structure
        } as ImportedBookmark & { path: string })
        
        if (item.children && item.children.length > 0) {
          flatten(item.children, currentPath)
        }
      }
    }
    
    flatten(bookmarks)
    return flat
  }

  /**
   * Get imported bookmarks for a profile
   */
  static async getProfileBookmarks(profileId: string): Promise<ImportedBookmark[]> {
    const paths = await this.getProfilePaths(profileId)
    const bookmarksFile = join(paths.bookmarks, 'bookmarks.json')
    
    try {
      const content = await fs.readFile(bookmarksFile, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      return []
    }
  }

  /**
   * Get imported history for a profile
   */
  static async getProfileHistory(profileId: string, limit = 1000): Promise<ImportedHistoryEntry[]> {
    const paths = await this.getProfilePaths(profileId)
    const historyIndexFile = join(paths.history, 'history-index.json')
    
    try {
      const indexContent = await fs.readFile(historyIndexFile, 'utf-8')
      const index = JSON.parse(indexContent)
      
      const history: ImportedHistoryEntry[] = []
      const chunksToRead = Math.min(index.chunks, Math.ceil(limit / 1000))
      
      for (let i = 0; i < chunksToRead; i++) {
        const chunkFile = join(paths.history, `history-${i.toString().padStart(3, '0')}.json`)
        const chunkContent = await fs.readFile(chunkFile, 'utf-8')
        const chunk = JSON.parse(chunkContent)
        history.push(...chunk)
        
        if (history.length >= limit) break
      }
      
      return history.slice(0, limit)
    } catch (error) {
      return []
    }
  }

  /**
   * Get imported passwords for a profile (returns index only, not actual passwords)
   */
  static async getProfilePasswordsIndex(profileId: string): Promise<Omit<ImportedPassword, 'encryptedPassword'>[]> {
    const paths = await this.getProfilePaths(profileId)
    const passwordIndexFile = join(paths.passwords, 'passwords-index.json')
    
    try {
      const content = await fs.readFile(passwordIndexFile, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      return []
    }
  }

  private static async clearDirectory(dirPath: string): Promise<void> {
    try {
      const files = await fs.readdir(dirPath)
      const deletePromises = files.map(file => 
        fs.rm(join(dirPath, file), { recursive: true, force: true })
      )
      await Promise.all(deletePromises)
    } catch (error) {
      // Directory might not exist, which is fine
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  private static async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0
    
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const file of files) {
        const filePath = join(dirPath, file.name)
        
        if (file.isDirectory()) {
          size += await this.getDirectorySize(filePath)
        } else {
          const stats = await fs.stat(filePath)
          size += stats.size
        }
      }
    } catch (error) {
      // Directory might not exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Error calculating directory size for ${dirPath}:`, error)
      }
    }
    
    return size
  }

  private static async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true })
    
    const files = await fs.readdir(src, { withFileTypes: true })
    
    for (const file of files) {
      const srcPath = join(src, file.name)
      const destPath = join(dest, file.name)
      
      if (file.isDirectory()) {
        await this.copyDirectory(srcPath, destPath)
      } else {
        await fs.copyFile(srcPath, destPath)
      }
    }
  }
}