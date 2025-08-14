import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface FirefoxProfile {
  id: string;
  name: string;
  path: string;
  isDefault: boolean;
  isRelative: boolean;
}

export interface FirefoxInstallation {
  version: string;
  installPath: string;
  profiles: FirefoxProfile[];
}

export class FirefoxProfileDetector {
  private static readonly FIREFOX_PROFILE_PATHS = {
    darwin: [
      path.join(os.homedir(), 'Library/Application Support/Firefox'),
      path.join(os.homedir(), 'Library/Application Support/Firefox Developer Edition'),
    ],
    win32: [
      path.join(os.homedir(), 'AppData/Roaming/Mozilla/Firefox'),
      path.join(os.homedir(), 'AppData/Local/Mozilla/Firefox'),
    ],
    linux: [
      path.join(os.homedir(), '.mozilla/firefox'),
      path.join(os.homedir(), 'snap/firefox/common/.mozilla/firefox'),
    ],
  };

  /**
   * Detect all Firefox installations on the system
   */
  async detectFirefoxInstallations(): Promise<FirefoxInstallation[]> {
    const platform = os.platform() as keyof typeof FirefoxProfileDetector.FIREFOX_PROFILE_PATHS;
    const searchPaths = FirefoxProfileDetector.FIREFOX_PROFILE_PATHS[platform] || [];
    
    const installations: FirefoxInstallation[] = [];

    for (const searchPath of searchPaths) {
      try {
        const installation = await this.scanFirefoxDirectory(searchPath);
        if (installation) {
          installations.push(installation);
        }
      } catch (error) {
        // Directory doesn't exist or is inaccessible, continue searching
        console.debug(`Firefox directory not found: ${searchPath}`);
      }
    }

    return installations;
  }

  /**
   * Scan a specific Firefox directory for profiles
   */
  private async scanFirefoxDirectory(firefoxPath: string): Promise<FirefoxInstallation | null> {
    try {
      await fs.access(firefoxPath);
      
      const profilesIniPath = path.join(firefoxPath, 'profiles.ini');
      const profiles = await this.parseProfilesIni(profilesIniPath, firefoxPath);
      
      if (profiles.length === 0) {
        return null;
      }

      // Try to detect Firefox version
      const version = await this.detectFirefoxVersion(firefoxPath);

      return {
        version,
        installPath: firefoxPath,
        profiles,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse Firefox profiles.ini file
   */
  async parseProfilesIni(profilesIniPath: string, basePath: string): Promise<FirefoxProfile[]> {
    try {
      const content = await fs.readFile(profilesIniPath, 'utf-8');
      return this.parseIniContent(content, basePath);
    } catch (error) {
      throw new Error(`Failed to parse profiles.ini: ${error.message}`);
    }
  }

  /**
   * Parse INI file content and extract profile information
   */
  private parseIniContent(content: string, basePath: string): FirefoxProfile[] {
    const profiles: FirefoxProfile[] = [];
    const lines = content.split('\n').map(line => line.trim());
    
    let currentSection: string | null = null;
    let currentProfile: Partial<FirefoxProfile> = {};

    for (const line of lines) {
      if (line.startsWith('[') && line.endsWith(']')) {
        // Save previous profile if it was a profile section
        if (currentSection?.startsWith('Profile') && this.isValidProfile(currentProfile)) {
          profiles.push(currentProfile as FirefoxProfile);
        }
        
        currentSection = line.slice(1, -1);
        currentProfile = {};
        continue;
      }

      if (!currentSection?.startsWith('Profile')) {
        continue;
      }

      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();

      switch (key?.trim()) {
        case 'Name':
          currentProfile.name = value;
          break;
        case 'Path':
          currentProfile.isRelative = !path.isAbsolute(value);
          currentProfile.path = currentProfile.isRelative 
            ? path.join(basePath, value)
            : value;
          break;
        case 'IsRelative':
          currentProfile.isRelative = value === '1';
          break;
        case 'Default':
          currentProfile.isDefault = value === '1';
          break;
      }
    }

    // Don't forget the last profile
    if (currentSection?.startsWith('Profile') && this.isValidProfile(currentProfile)) {
      profiles.push(currentProfile as FirefoxProfile);
    }

    // Generate IDs for profiles
    return profiles.map((profile, index) => ({
      ...profile,
      id: `firefox-profile-${index}`,
    }));
  }

  /**
   * Check if profile object has required fields
   */
  private isValidProfile(profile: Partial<FirefoxProfile>): profile is FirefoxProfile {
    return !!(profile.name && profile.path);
  }

  /**
   * Try to detect Firefox version from installation
   */
  private async detectFirefoxVersion(firefoxPath: string): Promise<string> {
    // Try to read version from various possible locations
    const versionFiles = [
      path.join(firefoxPath, 'compatibility.ini'),
      path.join(firefoxPath, 'application.ini'),
    ];

    for (const versionFile of versionFiles) {
      try {
        const content = await fs.readFile(versionFile, 'utf-8');
        const versionMatch = content.match(/Version=([^\r\n]+)/);
        if (versionMatch) {
          return versionMatch[1];
        }
      } catch (error) {
        // File doesn't exist, continue
      }
    }

    return 'Unknown';
  }

  /**
   * Check if a Firefox profile directory exists and is accessible
   */
  async validateProfilePath(profilePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(profilePath);
      return stat.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get profile metadata from a Firefox profile directory
   */
  async getProfileMetadata(profilePath: string): Promise<{
    lastModified: Date;
    size: number;
    hasBookmarks: boolean;
    hasHistory: boolean;
    hasPasswords: boolean;
  }> {
    const metadata = {
      lastModified: new Date(0),
      size: 0,
      hasBookmarks: false,
      hasHistory: false,
      hasPasswords: false,
    };

    try {
      const files = await fs.readdir(profilePath);
      
      for (const file of files) {
        const filePath = path.join(profilePath, file);
        const stat = await fs.stat(filePath);
        
        metadata.size += stat.size;
        
        if (stat.mtime > metadata.lastModified) {
          metadata.lastModified = stat.mtime;
        }

        // Check for specific Firefox data files
        switch (file) {
          case 'places.sqlite':
            metadata.hasBookmarks = true;
            metadata.hasHistory = true;
            break;
          case 'key4.db':
          case 'logins.json':
            metadata.hasPasswords = true;
            break;
        }
      }
    } catch (error) {
      console.error(`Error reading profile metadata: ${error.message}`);
    }

    return metadata;
  }
}