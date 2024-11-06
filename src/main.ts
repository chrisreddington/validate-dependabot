import * as core from '@actions/core'
import * as github from '@actions/github'
import * as yaml from 'js-yaml'

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

function getEcosystemLanguageMapping(
  repoLanguages: string[]
): Map<string, string[]> {
  const mapping = new Map<string, string[]>()

  for (const [ecosystem, langs] of Object.entries(SUPPORTED_ECOSYSTEMS)) {
    const matchedLangs = langs.filter(lang => repoLanguages.includes(lang))
    if (matchedLangs.length > 0) {
      mapping.set(ecosystem, matchedLangs)
    }
  }

  return mapping
}

export async function run(): Promise<void> {
  try {
    // Get GitHub token input
    const token = core.getInput('github-token', { required: true })
    const octokit = github.getOctokit(token)
    const context = github.context

    // Get repository languages
    const { data: languages } = await octokit.rest.repos.listLanguages({
      owner: context.repo.owner,
      repo: context.repo.repo
    })

    const repoLanguages = Object.keys(languages)
    core.info(`Found languages: ${repoLanguages.join(', ')}`)

    // Get supported ecosystems and their languages
    const ecosystemMapping = getEcosystemLanguageMapping(repoLanguages)
    const supportedEcosystems = new Set(ecosystemMapping.keys())

    if (supportedEcosystems.size === 0) {
      core.info('No supported Dependabot ecosystems found for this repository')
      return
    }

    // Display detailed ecosystem information
    core.info('\nSupported Dependabot ecosystems for your repository:')
    for (const [ecosystem, languages] of ecosystemMapping) {
      core.info(`- ${ecosystem}: ${languages.join(', ')}`)
    }
    core.info('') // Empty line for better readability

    // Check Dependabot configuration
    try {
      const dependabotConfig = await octokit.rest.repos.getContent({
        owner: context.repo.owner,
        repo: context.repo.repo,
        path: '.github/dependabot.yml'
      })

      if ('content' in dependabotConfig.data) {
        const config = yaml.load(
          Buffer.from(dependabotConfig.data.content, 'base64').toString()
        ) as { updates?: { 'package-ecosystem': string }[] }

        if (!config || !config.updates || !Array.isArray(config.updates)) {
          core.setFailed(
            'Invalid dependabot.yml: Missing or invalid "updates" configuration'
          )
          return
        }

        const configuredEcosystems = new Set(
          config.updates.map(u => u['package-ecosystem'])
        )

        const missingEcosystems = [...supportedEcosystems].filter(
          eco => !configuredEcosystems.has(eco)
        )

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
      if (error instanceof Error) {
        core.setFailed(`No .github/dependabot.yml file found. ${error.message}`)
      } else {
        core.setFailed('No .github/dependabot.yml file found.')
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
