import * as core from '@actions/core'
import { EcosystemMapping } from './types'

export const SUPPORTED_ECOSYSTEMS: EcosystemMapping = {
  npm: ['JavaScript', 'TypeScript'],
  pip: ['Python'],
  maven: ['Java'],
  nuget: ['C#', 'F#'],
  bundler: ['Ruby'],
  composer: ['PHP'],
  cargo: ['Rust'],
  gomod: ['Go'],
  mix: ['Elixir'],
  gradle: ['Java', 'Kotlin']
}

export function getEcosystemLanguageMapping(
  repoLanguages: string[]
): Map<string, string[]> {
  core.debug(
    "Mapping Dependabot's supported ecosystems to repository languages"
  )
  const mapping = new Map<string, string[]>()

  for (const [ecosystem, langs] of Object.entries(SUPPORTED_ECOSYSTEMS)) {
    core.debug(
      `Checking ecosystem: ${ecosystem} with languages: ${langs.join(', ')}`
    )
    const matchedLangs = langs.filter(lang => repoLanguages.includes(lang))
    if (matchedLangs.length > 0) {
      core.debug(`Found matches for ${ecosystem}: ${matchedLangs.join(', ')}`)
      mapping.set(ecosystem, matchedLangs)
    }
  }

  return mapping
}
