/**
 * Cooldown configuration for a Dependabot update entry.
 * At least one field must be set for the cooldown to be considered configured.
 */
export interface DependabotCooldown {
  /** Default cooldown in days applied to all update types */
  'default-days'?: number
  /** Cooldown in days for major version updates */
  'semver-major-days'?: number
  /** Cooldown in days for minor version updates */
  'semver-minor-days'?: number
  /** Cooldown in days for patch version updates */
  'semver-patch-days'?: number
}

/**
 * A single group definition within a Dependabot update entry
 */
export interface DependabotGroup {
  /** Restrict group to production or development dependencies */
  'dependency-type'?: 'development' | 'production'
  /** Version update types to include in this group */
  'update-types'?: string[]
  /** Glob patterns of dependency names to include */
  patterns?: string[]
  /** Glob patterns of dependency names to exclude */
  'exclude-patterns'?: string[]
}

/**
 * A single update configuration block within dependabot.yml
 */
export interface DependabotUpdate {
  /** The package manager ecosystem (e.g., npm, pip, maven) */
  'package-ecosystem': string
  /**
   * Cooldown settings to throttle how quickly updates are opened.
   * Can be null if the YAML key is present but has no value.
   */
  cooldown?: DependabotCooldown | null
  /**
   * Named groups to batch related dependency updates into a single PR.
   * Can be null if the YAML key is present but has no value.
   */
  groups?: { [key: string]: DependabotGroup } | null
}

/**
 * Represents the structure of a dependabot.yml configuration file
 */
export interface DependabotConfig {
  /** Array of update configurations for different package ecosystems */
  updates?: DependabotUpdate[]
}

/**
 * Maps package ecosystems to their associated programming languages
 * @example { "npm": ["JavaScript", "TypeScript"] }
 */
export interface EcosystemMapping {
  [key: string]: string[]
}

/**
 * Options for controlling which optional policies are validated
 */
export interface ValidationOptions {
  /** When true, fail if any ecosystem update entry has no cooldown configured */
  requireCooldown?: boolean
  /** When true, fail if any ecosystem update entry has no groups configured */
  requireGroups?: boolean
}
