import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FirefoxProfileDetector } from '../FirefoxProfileDetector';

describe('FirefoxProfileDetector', () => {
  let detector: FirefoxProfileDetector;

  beforeEach(() => {
    detector = new FirefoxProfileDetector();
  });

  describe('detectFirefoxInstallations', () => {
    it('should return empty array when no Firefox installations found', async () => {
      const installations = await detector.detectFirefoxInstallations();
      expect(Array.isArray(installations)).toBe(true);
    });
  });

  describe('parseIniContent', () => {
    it('should parse profiles.ini content with relative paths', () => {
      const profilesIniContent = `
[General]
StartWithLastProfile=1

[Profile0]
Name=default-release
IsRelative=1
Path=Profiles/abc123.default-release
Default=1

[Profile1]
Name=dev-profile
IsRelative=1
Path=Profiles/def456.dev-profile
      `;

      // Access the private method for testing
      const profiles = (detector as any).parseIniContent(profilesIniContent, '/firefox');

      expect(profiles).toHaveLength(2);
      expect(profiles[0]).toEqual({
        id: 'firefox-profile-0',
        name: 'default-release',
        path: '/firefox/Profiles/abc123.default-release',
        isDefault: true,
        isRelative: true,
      });
      expect(profiles[1]).toEqual({
        id: 'firefox-profile-1',
        name: 'dev-profile',
        path: '/firefox/Profiles/def456.dev-profile',
        isRelative: true,
      });
    });

    it('should parse profiles.ini content with absolute paths', () => {
      const profilesIniContent = `
[Profile0]
Name=custom-profile
IsRelative=0
Path=/custom/path/to/profile
      `;

      const profiles = (detector as any).parseIniContent(profilesIniContent, '/firefox');

      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toEqual({
        id: 'firefox-profile-0',
        name: 'custom-profile',
        path: '/custom/path/to/profile',
        isRelative: false,
      });
    });

    it('should handle malformed profiles.ini content', () => {
      const profilesIniContent = `
[Profile0]
Name=incomplete-profile
# Missing Path
      `;

      const profiles = (detector as any).parseIniContent(profilesIniContent, '/firefox');

      expect(profiles).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const profiles = (detector as any).parseIniContent('', '/firefox');
      expect(profiles).toHaveLength(0);
    });

    it('should handle content with no profiles', () => {
      const profilesIniContent = `
[General]
StartWithLastProfile=1
      `;

      const profiles = (detector as any).parseIniContent(profilesIniContent, '/firefox');
      expect(profiles).toHaveLength(0);
    });
  });

  describe('validateProfilePath', () => {
    it('should return false for non-existent path', async () => {
      const isValid = await detector.validateProfilePath('/nonexistent/path/that/does/not/exist');
      expect(isValid).toBe(false);
    });
  });

  describe('getProfileMetadata', () => {
    it('should handle non-existent profile directory', async () => {
      const metadata = await detector.getProfileMetadata('/nonexistent/profile/path');

      expect(metadata).toEqual({
        lastModified: new Date(0),
        size: 0,
        hasBookmarks: false,
        hasHistory: false,
        hasPasswords: false,
      });
    });
  });

  describe('utility methods', () => {
    it('should validate profile objects correctly', () => {
      const validProfile = {
        name: 'test-profile',
        path: '/path/to/profile',
        isDefault: false,
        isRelative: true,
      };

      const invalidProfile = {
        name: 'test-profile',
        // missing path
        isDefault: false,
        isRelative: true,
      };

      // Access private method for testing
      expect((detector as any).isValidProfile(validProfile)).toBe(true);
      expect((detector as any).isValidProfile(invalidProfile)).toBe(false);
    });
  });
});