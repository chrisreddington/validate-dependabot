export interface DependabotConfig {
  updates?: {
    'package-ecosystem': string
  }[]
}

export interface EcosystemMapping {
  [key: string]: string[]
}
