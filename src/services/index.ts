export { DatabaseService } from './DatabaseService'
export { DatabaseMigrationService } from './DatabaseMigrations'
export { DatabaseSeeder } from './DatabaseSeeder'
export { BrowserEngine } from './BrowserEngine'
export { ProfileManager } from './ProfileManager'
export { ExtensionManager } from './ExtensionManager'
export { WebExtensionBridge, ExtensionContext } from './WebExtensionBridge'
export { FirefoxProfileDetector } from './FirefoxProfileDetector'

export type {
  DatabaseProfile,
  DatabaseSession,
  DatabaseUserAgentPreset,
  DatabasePerformanceMetric
} from './DatabaseService'

export type { Migration } from './DatabaseMigrations'