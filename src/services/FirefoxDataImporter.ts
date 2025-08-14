import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { FirefoxProfile } from './FirefoxProfileDetector';

export interface ImportProgress {
  stage: 'bookmarks' | 'history' | 'passwords' | 'settings' | 'complete';
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface ImportedBookmark {
  id: string;
  title: string;
  url: string;
  parentId?: string;
  dateAdded: Date;
  lastModified: Date;
  type: 'bookmark' | 'folder';
  children?: ImportedBookmark[];
}

export interface ImportedHistoryEntry {
  id: string;
  url: string;
  title: string;
  visitCount: number;
  lastVisitTime: Date;
  typed: boolean;
}

export interface ImportedPassword {
  id: string;
  hostname: string;
  username: string;
  encryptedPassword: string;
  timeCreated: Date;
  timeLastUsed: Date;
  timesUsed: number;
}

export interface ImportedSettings {
  homepage: string;
  searchEngine: string;
  downloadDirectory: string;
  privacy: {
    trackingProtection: boolean;
    cookiePolicy: string;
    historyEnabled: boolean;
  };
  security: {
    passwordManager: boolean;
    masterPassword: boolean;
  };
}

export interface ImportResult {
  bookmarks: ImportedBookmark[];
  history: ImportedHistoryEntry[];
  passwords: ImportedPassword[];
  settings: ImportedSettings;
  stats: {
    bookmarksCount: number;
    historyCount: number;
    passwordsCount: number;
  };
}

export class FirefoxDataImporter {
  private progressCallback?: (progress: ImportProgress) => void;

  constructor(progressCallback?: (progress: ImportProgress) => void) {
    this.progressCallback = progressCallback;
  }

  /**
   * Import all data from a Firefox profile
   */
  async importProfile(firefoxProfile: FirefoxProfile): Promise<ImportResult> {
    const result: ImportResult = {
      bookmarks: [],
      history: [],
      passwords: [],
      settings: {
        homepage: '',
        searchEngine: '',
        downloadDirectory: '',
        privacy: {
          trackingProtection: false,
          cookiePolicy: 'default',
          historyEnabled: true,
        },
        security: {
          passwordManager: false,
          masterPassword: false,
        },
      },
      stats: {
        bookmarksCount: 0,
        historyCount: 0,
        passwordsCount: 0,
      },
    };

    try {
      // Import bookmarks and history from places.sqlite
      this.updateProgress('bookmarks', 0, 'Reading Firefox bookmarks...');
      const placesData = await this.importPlacesData(firefoxProfile.path);
      result.bookmarks = placesData.bookmarks;
      result.history = placesData.history;
      result.stats.bookmarksCount = placesData.bookmarks.length;
      result.stats.historyCount = placesData.history.length;

      // Import passwords
      this.updateProgress('passwords', 50, 'Reading Firefox passwords...');
      result.passwords = await this.importPasswords(firefoxProfile.path);
      result.stats.passwordsCount = result.passwords.length;

      // Import settings
      this.updateProgress('settings', 75, 'Reading Firefox settings...');
      result.settings = await this.importSettings(firefoxProfile.path);

      this.updateProgress('complete', 100, 'Import completed successfully');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateProgress('complete', 0, 'Import failed', errorMessage);
      throw error;
    }
  }

  /**
   * Import bookmarks and history from places.sqlite
   */
  private async importPlacesData(profilePath: string): Promise<{
    bookmarks: ImportedBookmark[];
    history: ImportedHistoryEntry[];
  }> {
    const placesPath = path.join(profilePath, 'places.sqlite');
    
    // Check if places.sqlite exists
    try {
      await fs.access(placesPath);
    } catch (error) {
      throw new Error(`Firefox places.sqlite not found at ${placesPath}`);
    }

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(placesPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          reject(new Error(`Failed to open places.sqlite: ${err.message}`));
          return;
        }

        Promise.all([
          this.extractBookmarks(db),
          this.extractHistory(db),
        ])
          .then(([bookmarks, history]) => {
            db.close();
            resolve({ bookmarks, history });
          })
          .catch((error) => {
            db.close();
            reject(error);
          });
      });
    });
  }

  /**
   * Extract bookmarks from places database
   */
  private extractBookmarks(db: sqlite3.Database): Promise<ImportedBookmark[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          b.id,
          b.title,
          p.url,
          b.parent as parentId,
          b.dateAdded,
          b.lastModified,
          b.type
        FROM moz_bookmarks b
        LEFT JOIN moz_places p ON b.fk = p.id
        WHERE b.type IN (1, 2) -- 1 = bookmark, 2 = folder
        ORDER BY b.parent, b.position
      `;

      db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(new Error(`Failed to extract bookmarks: ${err.message}`));
          return;
        }

        const bookmarks: ImportedBookmark[] = rows.map((row) => ({
          id: row.id.toString(),
          title: row.title || 'Untitled',
          url: row.url || '',
          parentId: row.parentId ? row.parentId.toString() : undefined,
          dateAdded: new Date(row.dateAdded / 1000), // Firefox stores microseconds
          lastModified: new Date(row.lastModified / 1000),
          type: row.type === 1 ? 'bookmark' : 'folder',
        }));

        // Build hierarchical structure
        const hierarchicalBookmarks = this.buildBookmarkHierarchy(bookmarks);
        resolve(hierarchicalBookmarks);
      });
    });
  }

  /**
   * Extract browsing history from places database
   */
  private extractHistory(db: sqlite3.Database): Promise<ImportedHistoryEntry[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          p.id,
          p.url,
          p.title,
          p.visit_count as visitCount,
          p.last_visit_date as lastVisitTime,
          p.typed
        FROM moz_places p
        WHERE p.visit_count > 0
        ORDER BY p.last_visit_date DESC
        LIMIT 10000
      `;

      db.all(query, [], (err, rows: any[]) => {
        if (err) {
          reject(new Error(`Failed to extract history: ${err.message}`));
          return;
        }

        const history: ImportedHistoryEntry[] = rows.map((row) => ({
          id: row.id.toString(),
          url: row.url,
          title: row.title || 'Untitled',
          visitCount: row.visitCount,
          lastVisitTime: new Date(row.lastVisitTime / 1000), // Firefox stores microseconds
          typed: Boolean(row.typed),
        }));

        resolve(history);
      });
    });
  }

  /**
   * Build hierarchical bookmark structure
   */
  private buildBookmarkHierarchy(bookmarks: ImportedBookmark[]): ImportedBookmark[] {
    const bookmarkMap = new Map<string, ImportedBookmark>();
    const rootBookmarks = new Map<string, ImportedBookmark>();

    // Create map for quick lookup
    bookmarks.forEach((bookmark) => {
      bookmarkMap.set(bookmark.id, { ...bookmark, children: [] });
    });

    // Build hierarchy
    bookmarks.forEach((bookmark) => {
      const bookmarkWithChildren = bookmarkMap.get(bookmark.id)!;
      
      if (bookmark.parentId && bookmarkMap.has(bookmark.parentId)) {
        const parent = bookmarkMap.get(bookmark.parentId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(bookmarkWithChildren);
      } else {
        // Root level bookmark (or orphaned)
        rootBookmarks.set(bookmark.id, bookmarkWithChildren);
      }
    });

    return Array.from(rootBookmarks.values());
  }

  /**
   * Import saved passwords from Firefox
   */
  private async importPasswords(profilePath: string): Promise<ImportedPassword[]> {
    const loginsPath = path.join(profilePath, 'logins.json');
    const key4Path = path.join(profilePath, 'key4.db');

    try {
      // Check if password files exist
      await fs.access(loginsPath);
      await fs.access(key4Path);
    } catch (error) {
      // No password data available
      return [];
    }

    try {
      // Read logins.json
      const loginsContent = await fs.readFile(loginsPath, 'utf-8');
      const loginsData = JSON.parse(loginsContent);

      const passwords: ImportedPassword[] = [];

      if (loginsData.logins && Array.isArray(loginsData.logins)) {
        for (const login of loginsData.logins) {
          // Encrypt the password for secure storage
          const encryptedPassword = this.encryptPassword(login.encryptedPassword || '');

          passwords.push({
            id: login.id?.toString() || crypto.randomUUID(),
            hostname: login.hostname || '',
            username: login.encryptedUsername || '',
            encryptedPassword,
            timeCreated: new Date(login.timeCreated || Date.now()),
            timeLastUsed: new Date(login.timeLastUsed || Date.now()),
            timesUsed: login.timesUsed || 0,
          });
        }
      }

      return passwords;
    } catch (error) {
      console.warn('Failed to import Firefox passwords:', error);
      return [];
    }
  }

  /**
   * Import Firefox settings and preferences
   */
  private async importSettings(profilePath: string): Promise<ImportedSettings> {
    const prefsPath = path.join(profilePath, 'prefs.js');
    const settings: ImportedSettings = {
      homepage: '',
      searchEngine: '',
      downloadDirectory: '',
      privacy: {
        trackingProtection: false,
        cookiePolicy: 'default',
        historyEnabled: true,
      },
      security: {
        passwordManager: false,
        masterPassword: false,
      },
    };

    try {
      const prefsContent = await fs.readFile(prefsPath, 'utf-8');
      const prefLines = prefsContent.split('\n');

      for (const line of prefLines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith('user_pref(')) continue;

        // Parse preference line: user_pref("pref.name", value);
        const match = trimmedLine.match(/user_pref\("([^"]+)",\s*(.+)\);/);
        if (!match) continue;

        const [, prefName, prefValue] = match;
        const cleanValue = prefValue.replace(/^["']|["']$/g, ''); // Remove quotes

        switch (prefName) {
          case 'browser.startup.homepage':
            settings.homepage = cleanValue;
            break;
          case 'browser.search.defaultenginename':
            settings.searchEngine = cleanValue;
            break;
          case 'browser.download.dir':
            settings.downloadDirectory = cleanValue;
            break;
          case 'privacy.trackingprotection.enabled':
            settings.privacy.trackingProtection = cleanValue === 'true';
            break;
          case 'network.cookie.cookieBehavior':
            settings.privacy.cookiePolicy = this.mapCookiePolicy(parseInt(cleanValue));
            break;
          case 'places.history.enabled':
            settings.privacy.historyEnabled = cleanValue === 'true';
            break;
          case 'signon.rememberSignons':
            settings.security.passwordManager = cleanValue === 'true';
            break;
          case 'signon.masterPasswordReprompt':
            settings.security.masterPassword = cleanValue === 'true';
            break;
        }
      }
    } catch (error) {
      console.warn('Failed to import Firefox settings:', error);
    }

    return settings;
  }

  /**
   * Map Firefox cookie policy numbers to readable strings
   */
  private mapCookiePolicy(policy: number): string {
    switch (policy) {
      case 0: return 'accept_all';
      case 1: return 'accept_same_site';
      case 2: return 'reject_all';
      case 3: return 'accept_visited';
      case 4: return 'reject_third_party';
      default: return 'default';
    }
  }

  /**
   * Encrypt password for secure storage
   */
  private encryptPassword(password: string): string {
    if (!password) return '';
    
    // Use a simple encryption for demo purposes
    // In production, use proper encryption with user's master password
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('ruthenium-browser-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Update progress callback
   */
  private updateProgress(stage: ImportProgress['stage'], progress: number, message: string, error?: string): void {
    if (this.progressCallback) {
      this.progressCallback({ stage, progress, message, error });
    }
  }

  /**
   * Validate Firefox profile before import
   */
  async validateProfile(profilePath: string): Promise<{
    isValid: boolean;
    hasBookmarks: boolean;
    hasHistory: boolean;
    hasPasswords: boolean;
    hasSettings: boolean;
    errors: string[];
  }> {
    const validation = {
      isValid: true,
      hasBookmarks: false,
      hasHistory: false,
      hasPasswords: false,
      hasSettings: false,
      errors: [] as string[],
    };

    try {
      // Check for places.sqlite (bookmarks and history)
      const placesPath = path.join(profilePath, 'places.sqlite');
      try {
        await fs.access(placesPath);
        validation.hasBookmarks = true;
        validation.hasHistory = true;
      } catch (error) {
        validation.errors.push('places.sqlite not found - no bookmarks or history available');
      }

      // Check for password files
      const loginsPath = path.join(profilePath, 'logins.json');
      const key4Path = path.join(profilePath, 'key4.db');
      try {
        await fs.access(loginsPath);
        await fs.access(key4Path);
        validation.hasPasswords = true;
      } catch (error) {
        validation.errors.push('Password files not found - no saved passwords available');
      }

      // Check for settings
      const prefsPath = path.join(profilePath, 'prefs.js');
      try {
        await fs.access(prefsPath);
        validation.hasSettings = true;
      } catch (error) {
        validation.errors.push('prefs.js not found - no settings available');
      }

      // Profile is valid if it has at least one type of data
      validation.isValid = validation.hasBookmarks || validation.hasHistory || 
                          validation.hasPasswords || validation.hasSettings;

      if (!validation.isValid) {
        validation.errors.push('No importable data found in Firefox profile');
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Failed to validate profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return validation;
  }
}