import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import sqlite3 from 'sqlite3';
import { FirefoxDataImporter, ImportProgress, ImportResult } from '../FirefoxDataImporter';
import { FirefoxProfile } from '../FirefoxProfileDetector';

// Mock dependencies
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    promises: {
      access: vi.fn(),
      readFile: vi.fn(),
      mkdir: vi.fn(),
      writeFile: vi.fn(),
    },
  };
});

vi.mock('sqlite3');

describe('FirefoxDataImporter', () => {
  let importer: FirefoxDataImporter;
  let progressCallback: vi.MockedFunction<(progress: ImportProgress) => void>;
  let mockProfile: FirefoxProfile;
  let tempDir: string;

  beforeEach(async () => {
    progressCallback = vi.fn();
    importer = new FirefoxDataImporter(progressCallback);
    
    tempDir = path.join(os.tmpdir(), 'firefox-test-profile');
    mockProfile = {
      id: 'test-profile',
      name: 'Test Profile',
      path: tempDir,
      isDefault: true,
      isRelative: false,
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateProfile', () => {
    it('should validate a complete Firefox profile', async () => {
      // Mock file access for all required files
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockResolvedValue(undefined);

      const validation = await importer.validateProfile(tempDir);

      expect(validation.isValid).toBe(true);
      expect(validation.hasBookmarks).toBe(true);
      expect(validation.hasHistory).toBe(true);
      expect(validation.hasPasswords).toBe(true);
      expect(validation.hasSettings).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Verify all required files were checked
      expect(mockAccess).toHaveBeenCalledWith(path.join(tempDir, 'places.sqlite'));
      expect(mockAccess).toHaveBeenCalledWith(path.join(tempDir, 'logins.json'));
      expect(mockAccess).toHaveBeenCalledWith(path.join(tempDir, 'key4.db'));
      expect(mockAccess).toHaveBeenCalledWith(path.join(tempDir, 'prefs.js'));
    });

    it('should handle missing files gracefully', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockRejectedValue(new Error('File not found'));

      const validation = await importer.validateProfile(tempDir);

      expect(validation.isValid).toBe(false);
      expect(validation.hasBookmarks).toBe(false);
      expect(validation.hasHistory).toBe(false);
      expect(validation.hasPasswords).toBe(false);
      expect(validation.hasSettings).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should be valid with only bookmarks/history', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockImplementation((filePath) => {
        if (filePath.toString().includes('places.sqlite')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('File not found'));
      });

      const validation = await importer.validateProfile(tempDir);

      expect(validation.isValid).toBe(true);
      expect(validation.hasBookmarks).toBe(true);
      expect(validation.hasHistory).toBe(true);
      expect(validation.hasPasswords).toBe(false);
      expect(validation.hasSettings).toBe(false);
    });
  });

  describe('importProfile', () => {
    it('should import complete Firefox profile data', async () => {
      // Mock file access
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockResolvedValue(undefined);

      // Mock file reading
      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('logins.json')) {
          return Promise.resolve(JSON.stringify({
            logins: [
              {
                id: 1,
                hostname: 'https://example.com',
                encryptedUsername: 'testuser',
                encryptedPassword: 'encrypted_password',
                timeCreated: Date.now(),
                timeLastUsed: Date.now(),
                timesUsed: 5,
              },
            ],
          }));
        }
        if (pathStr.includes('prefs.js')) {
          return Promise.resolve(`
            user_pref("browser.startup.homepage", "https://example.com");
            user_pref("browser.search.defaultenginename", "Google");
            user_pref("privacy.trackingprotection.enabled", true);
            user_pref("signon.rememberSignons", true);
          `);
        }
        return Promise.resolve('');
      });

      // Mock SQLite database
      const mockDb = {
        all: vi.fn(),
        close: vi.fn(),
      };

      const mockSqlite3 = vi.mocked(sqlite3);
      mockSqlite3.Database = vi.fn().mockImplementation((path, mode, callback) => {
        callback(null);
        return mockDb;
      }) as any;

      // Mock database queries
      mockDb.all.mockImplementation((query, params, callback) => {
        if (query.includes('moz_bookmarks')) {
          callback(null, [
            {
              id: 1,
              title: 'Test Bookmark',
              url: 'https://example.com',
              parentId: null,
              dateAdded: Date.now() * 1000,
              lastModified: Date.now() * 1000,
              type: 1,
            },
          ]);
        } else if (query.includes('moz_places')) {
          callback(null, [
            {
              id: 1,
              url: 'https://example.com',
              title: 'Example Site',
              visitCount: 5,
              lastVisitTime: Date.now() * 1000,
              typed: 1,
            },
          ]);
        } else {
          callback(null, []);
        }
      });

      const result = await importer.importProfile(mockProfile);

      expect(result).toBeDefined();
      expect(result.bookmarks).toHaveLength(1);
      expect(result.history).toHaveLength(1);
      expect(result.passwords).toHaveLength(1);
      expect(result.settings.homepage).toBe('https://example.com');
      expect(result.stats.bookmarksCount).toBe(1);
      expect(result.stats.historyCount).toBe(1);
      expect(result.stats.passwordsCount).toBe(1);

      // Verify progress callbacks were called
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'bookmarks',
          progress: 0,
          message: 'Reading Firefox bookmarks...',
        })
      );
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'complete',
          progress: 100,
          message: 'Import completed successfully',
        })
      );
    });

    it('should handle import errors gracefully', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockRejectedValue(new Error('File not found'));

      await expect(importer.importProfile(mockProfile)).rejects.toThrow();

      // Verify error progress callback was called
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'complete',
          progress: 0,
          message: 'Import failed',
          error: expect.any(String),
        })
      );
    });

    it('should handle missing password files', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockImplementation((filePath) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('places.sqlite') || pathStr.includes('prefs.js')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('File not found'));
      });

      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockImplementation((filePath) => {
        if (filePath.toString().includes('prefs.js')) {
          return Promise.resolve('user_pref("browser.startup.homepage", "https://example.com");');
        }
        return Promise.resolve('');
      });

      // Mock SQLite database
      const mockDb = {
        all: vi.fn((query, params, callback) => callback(null, [])),
        close: vi.fn(),
      };

      const mockSqlite3 = vi.mocked(sqlite3);
      mockSqlite3.Database = vi.fn().mockImplementation((path, mode, callback) => {
        callback(null);
        return mockDb;
      }) as any;

      const result = await importer.importProfile(mockProfile);

      expect(result.passwords).toHaveLength(0);
      expect(result.stats.passwordsCount).toBe(0);
      expect(result.settings.homepage).toBe('https://example.com');
    });
  });

  describe('bookmark hierarchy', () => {
    it('should build correct bookmark hierarchy', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockResolvedValue(undefined);

      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockResolvedValue('');

      // Mock SQLite database with hierarchical bookmarks
      const mockDb = {
        all: vi.fn(),
        close: vi.fn(),
      };

      const mockSqlite3 = vi.mocked(sqlite3);
      mockSqlite3.Database = vi.fn().mockImplementation((path, mode, callback) => {
        callback(null);
        return mockDb;
      }) as any;

      mockDb.all.mockImplementation((query, params, callback) => {
        if (query.includes('moz_bookmarks')) {
          callback(null, [
            {
              id: 1,
              title: 'Folder',
              url: null,
              parentId: null,
              dateAdded: Date.now() * 1000,
              lastModified: Date.now() * 1000,
              type: 2, // folder
            },
            {
              id: 2,
              title: 'Child Bookmark',
              url: 'https://child.example.com',
              parentId: 1,
              dateAdded: Date.now() * 1000,
              lastModified: Date.now() * 1000,
              type: 1, // bookmark
            },
          ]);
        } else {
          callback(null, []);
        }
      });

      const result = await importer.importProfile(mockProfile);

      expect(result.bookmarks).toHaveLength(1); // Only root folder
      expect(result.bookmarks[0].type).toBe('folder');
      expect(result.bookmarks[0].children).toHaveLength(1);
      expect(result.bookmarks[0].children![0].title).toBe('Child Bookmark');
    });
  });

  describe('settings parsing', () => {
    it('should parse Firefox preferences correctly', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockResolvedValue(undefined);

      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockImplementation((filePath) => {
        if (filePath.toString().includes('prefs.js')) {
          return Promise.resolve(`
            user_pref("browser.startup.homepage", "https://homepage.com");
            user_pref("browser.search.defaultenginename", "DuckDuckGo");
            user_pref("browser.download.dir", "/Users/test/Downloads");
            user_pref("privacy.trackingprotection.enabled", true);
            user_pref("network.cookie.cookieBehavior", 4);
            user_pref("places.history.enabled", false);
            user_pref("signon.rememberSignons", true);
            user_pref("signon.masterPasswordReprompt", true);
          `);
        }
        return Promise.resolve('');
      });

      // Mock empty SQLite responses
      const mockDb = {
        all: vi.fn((query, params, callback) => callback(null, [])),
        close: vi.fn(),
      };

      const mockSqlite3 = vi.mocked(sqlite3);
      mockSqlite3.Database = vi.fn().mockImplementation((path, mode, callback) => {
        callback(null);
        return mockDb;
      }) as any;

      const result = await importer.importProfile(mockProfile);

      expect(result.settings.homepage).toBe('https://homepage.com');
      expect(result.settings.searchEngine).toBe('DuckDuckGo');
      expect(result.settings.downloadDirectory).toBe('/Users/test/Downloads');
      expect(result.settings.privacy.trackingProtection).toBe(true);
      expect(result.settings.privacy.cookiePolicy).toBe('reject_third_party');
      expect(result.settings.privacy.historyEnabled).toBe(false);
      expect(result.settings.security.passwordManager).toBe(true);
      expect(result.settings.security.masterPassword).toBe(true);
    });

    it('should handle malformed preferences gracefully', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockResolvedValue(undefined);

      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockImplementation((filePath) => {
        if (filePath.toString().includes('prefs.js')) {
          return Promise.resolve(`
            // This is a comment
            user_pref("valid.pref", "value");
            invalid line without proper format
            user_pref("another.valid", true);
          `);
        }
        return Promise.resolve('');
      });

      // Mock empty SQLite responses
      const mockDb = {
        all: vi.fn((query, params, callback) => callback(null, [])),
        close: vi.fn(),
      };

      const mockSqlite3 = vi.mocked(sqlite3);
      mockSqlite3.Database = vi.fn().mockImplementation((path, mode, callback) => {
        callback(null);
        return mockDb;
      }) as any;

      // Should not throw error
      const result = await importer.importProfile(mockProfile);
      expect(result.settings).toBeDefined();
    });
  });

  describe('progress tracking', () => {
    it('should track progress through all import stages', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockResolvedValue(undefined);

      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockResolvedValue('{}');

      const mockDb = {
        all: vi.fn((query, params, callback) => callback(null, [])),
        close: vi.fn(),
      };

      const mockSqlite3 = vi.mocked(sqlite3);
      mockSqlite3.Database = vi.fn().mockImplementation((path, mode, callback) => {
        callback(null);
        return mockDb;
      }) as any;

      await importer.importProfile(mockProfile);

      // Verify all progress stages were called
      const progressCalls = progressCallback.mock.calls.map(call => call[0]);
      
      expect(progressCalls).toContainEqual(
        expect.objectContaining({ stage: 'bookmarks', progress: 0 })
      );
      expect(progressCalls).toContainEqual(
        expect.objectContaining({ stage: 'passwords', progress: 50 })
      );
      expect(progressCalls).toContainEqual(
        expect.objectContaining({ stage: 'settings', progress: 75 })
      );
      expect(progressCalls).toContainEqual(
        expect.objectContaining({ stage: 'complete', progress: 100 })
      );
    });
  });

  describe('password encryption', () => {
    it('should encrypt passwords for secure storage', async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockResolvedValue(undefined);

      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockImplementation((filePath) => {
        if (filePath.toString().includes('logins.json')) {
          return Promise.resolve(JSON.stringify({
            logins: [
              {
                id: 1,
                hostname: 'https://example.com',
                encryptedUsername: 'testuser',
                encryptedPassword: 'plaintext_password',
                timeCreated: Date.now(),
                timeLastUsed: Date.now(),
                timesUsed: 1,
              },
            ],
          }));
        }
        return Promise.resolve('');
      });

      const mockDb = {
        all: vi.fn((query, params, callback) => callback(null, [])),
        close: vi.fn(),
      };

      const mockSqlite3 = vi.mocked(sqlite3);
      mockSqlite3.Database = vi.fn().mockImplementation((path, mode, callback) => {
        callback(null);
        return mockDb;
      }) as any;

      const result = await importer.importProfile(mockProfile);

      expect(result.passwords).toHaveLength(1);
      expect(result.passwords[0].encryptedPassword).not.toBe('plaintext_password');
      expect(result.passwords[0].encryptedPassword).toContain(':'); // Should contain IV separator
    });
  });
});