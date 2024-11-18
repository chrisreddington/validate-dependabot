/**
 * Represents the structure of a dependabot.yml configuration file
 */
export interface DependabotConfig {
  /** Array of update configurations for different package ecosystems */
  updates?: {
    /** The package manager ecosystem (e.g., npm, pip, maven) */
    'package-ecosystem': string
  }[]
}

/**
 * Maps package ecosystems to their associated programming languages
 * @example { "npm": ["JavaScript", "TypeScript"] }
 */
export interface EcosystemMapping {
  [key: string]: string[]
}
