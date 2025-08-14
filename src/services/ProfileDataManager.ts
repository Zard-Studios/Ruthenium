import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { Profile } from '../types'

export interface ProfileDataPaths {
  root: string
  cache: string
  cookies: string
  localStorage: string
  sessionStorage: string
  downloads: string
  extensions: string
  logs: string
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
      logs: join(profileRoot, 'logs')
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
      logs: join(profileRoot, 'logs')
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