import * as core from '@actions/core'
import * as github from '@actions/github'
import * as yaml from 'js-yaml'

// Mapping of Dependabot ecosystem identifiers to their corresponding programming languages
const SUPPORTED_ECOSYSTEMS = {
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

/**
 * Creates a mapping between Dependabot ecosystems and repository languages
 * @param repoLanguages Array of programming languages detected in the repository
 * @returns Map where key is the ecosystem (e.g., 'npm') and value is array of matching languages
 */
function getEcosystemLanguageMapping(
  repoLanguages: string[]
): Map<string, string[]> {
  core.debug(
    "Mapping Dependabot's supported ecosystems to repository languages"
  )
  const mapping = new Map<string, string[]>()

  // Iterate through each ecosystem and its supported languages
  for (const [ecosystem, langs] of Object.entries(SUPPORTED_ECOSYSTEMS)) {
    core.debug(
      `Checking ecosystem: ${ecosystem} with languages: ${langs.join(', ')}`
    )
    // Filter languages to only include ones present in the repository
    const matchedLangs = langs.filter(lang => repoLanguages.includes(lang))
    if (matchedLangs.length > 0) {
      core.debug(`Found matches for ${ecosystem}: ${matchedLangs.join(', ')}`)
      mapping.set(ecosystem, matchedLangs)
    }
  }

  return mapping
}

export async function run(): Promise<void> {
  try {
    core.debug('Starting validate-dependabot action')
    // Retrieve GitHub token from action inputs for API authentication
    const token = core.getInput('github-token', { required: true })
    core.debug('GitHub token retrieved')
    const octokit = github.getOctokit(token)
    const context = github.context

    // Get list of languages used in the repository via GitHub API
    core.debug(
      `Fetching languages for ${context.repo.owner}/${context.repo.repo}`
    )
    const { data: languages } = await octokit.rest.repos.listLanguages({
      owner: context.repo.owner,
      repo: context.repo.repo
    })

    // Convert language object keys to array of language names
    const repoLanguages = Object.keys(languages)
    core.info(`Found languages: ${repoLanguages.join(', ')}`)

    core.debug('Mapping repository languages to supported ecosystems')
    const ecosystemMapping = getEcosystemLanguageMapping(repoLanguages)
    // Create a Set of unique ecosystem identifiers that should be configured
    const supportedEcosystems = new Set(ecosystemMapping.keys())

    // Early exit if no supported ecosystems are found
    if (supportedEcosystems.size === 0) {
      core.debug('No supported ecosystems found')
      core.info('No supported Dependabot ecosystems found for this repository')
      return
    }

    // Output detailed ecosystem information for user reference
    core.info('\nSupported Dependabot ecosystems for your repository:')
    for (const [ecosystem, languages] of ecosystemMapping) {
      core.info(`- ${ecosystem}: ${languages.join(', ')}`)
    }
    core.info('') // Empty line for better readability

    // Validate Dependabot configuration
    try {
      core.debug('Attempting to read dependabot.yml configuration')
      // Fetch dependabot.yml content from repository
      const dependabotConfig = await octokit.rest.repos.getContent({
        owner: context.repo.owner,
        repo: context.repo.repo,
        path: '.github/dependabot.yml',
        ref: context.ref
      })

      core.debug(`dependabot.yml content retrieved for ${context.ref}`)

      // Process file content if it exists
      if ('content' in dependabotConfig.data) {
        core.debug('Parsing dependabot.yml content')
        // Decode base64 content and parse YAML
        const config = yaml.load(
          Buffer.from(dependabotConfig.data.content, 'base64').toString()
        ) as { updates?: { 'package-ecosystem': string }[] }

        // Validate basic structure of dependabot.yml
        if (!config || !config.updates || !Array.isArray(config.updates)) {
          core.debug('Invalid dependabot.yml structure detected')
          core.setFailed(
            'Invalid dependabot.yml: Missing or invalid "updates" configuration'
          )
          return
        }

        // Extract configured ecosystems from dependabot.yml
        const configuredEcosystems = new Set(
          config.updates.map(u => u['package-ecosystem'])
        )
        core.debug(
          `Ecosystems configured in dependabot.yml: ${[...configuredEcosystems].join(', ')}`
        )

        // Find ecosystems that should be configured but aren't
        const missingEcosystems = [...supportedEcosystems].filter(
          eco => !configuredEcosystems.has(eco)
        )
        core.debug(`Missing ecosystems: ${missingEcosystems.join(', ')}`)

        // Fail if any required ecosystems are missing from configuration
        if (missingEcosystems.length > 0) {
          core.setFailed(
            `Missing Dependabot configuration for ecosystems: ${missingEcosystems.join(
              ', '
            )}`
          )
        } else {
          core.info('All supported ecosystems are configured in dependabot.yml')
        }
      }
    } catch (error) {
      // Handle errors related to missing or invalid dependabot.yml
      core.debug(
        `Error while processing dependabot.yml: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      if (error instanceof Error) {
        core.setFailed(`No .github/dependabot.yml file found. ${error.message}`)
      } else {
        core.setFailed('No .github/dependabot.yml file found.')
      }
    }
  } catch (error) {
    // Handle any unexpected errors during execution
    core.debug(
      `Fatal error in action: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    if (error instanceof Error) core.setFailed(error.message)
  }
}
