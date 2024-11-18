import * as core from '@actions/core'
import * as github from '@actions/github'
import { getEcosystemLanguageMapping } from './ecosystem-mapping'
import { DependabotValidator } from './dependabot-validator'

export async function run(): Promise<void> {
  try {
    core.debug('Starting validate-dependabot action')
    const token = core.getInput('github-token', { required: true })
    const octokit = github.getOctokit(token)
    const context = github.context

    const { data: languages } = await octokit.rest.repos.listLanguages({
      owner: context.repo.owner,
      repo: context.repo.repo
    })

    const repoLanguages = Object.keys(languages)
    core.info(`Found languages: ${repoLanguages.join(', ')}`)

    const ecosystemMapping = getEcosystemLanguageMapping(repoLanguages)
    const supportedEcosystems = new Set(ecosystemMapping.keys())

    if (supportedEcosystems.size === 0) {
      core.info('No supported Dependabot ecosystems found for this repository')
      return
    }

    core.info('\nSupported Dependabot ecosystems for your repository:')
    for (const [ecosystem, languages] of ecosystemMapping) {
      core.info(`- ${ecosystem}: ${languages.join(', ')}`)
    }
    core.info('')

    const validator = new DependabotValidator(octokit)
    await validator.validateConfiguration(
      context.repo.owner,
      context.repo.repo,
      context.ref,
      supportedEcosystems
    )
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
