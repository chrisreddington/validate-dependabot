import * as core from '@actions/core'
import * as github from '@actions/github'
import * as yaml from 'js-yaml'
import { getOctokit } from '@actions/github'

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

export async function run(): Promise<void> {
  try {
    // Get GitHub token input
    const token = core.getInput('github-token', { required: true })
    const octokit = (await github.getOctokit(token)) as ReturnType<
      typeof getOctokit
    >
    const context = github.context

    // Get repository languages
    const { data: languages } = await octokit.rest.repos.listLanguages({
      owner: context.repo.owner,
      repo: context.repo.repo
    })

    const repoLanguages = Object.keys(languages)
    core.info(`Found languages: ${repoLanguages.join(', ')}`)

    // Get supported ecosystems for the languages
    const supportedEcosystems = new Set<string>()
    for (const [ecosystem, langs] of Object.entries(SUPPORTED_ECOSYSTEMS)) {
      if (repoLanguages.some(lang => langs.includes(lang))) {
        supportedEcosystems.add(ecosystem)
      }
    }

    if (supportedEcosystems.size === 0) {
      core.info('No supported Dependabot ecosystems found for this repository')
      return
    }

    core.info(`Supported ecosystems: ${[...supportedEcosystems].join(', ')}`)

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
        ) as { updates: { 'package-ecosystem': string }[] }

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
