import * as core from '@actions/core'
import * as github from '@actions/github'
import * as yaml from 'js-yaml'
import { DependabotConfig } from './types'

export class DependabotValidator {
  constructor(private octokit: ReturnType<typeof github.getOctokit>) {}

  async validateConfiguration(
    owner: string,
    repo: string,
    ref: string,
    supportedEcosystems: Set<string>
  ): Promise<void> {
    try {
      const dependabotConfig = await this.getDependabotConfig(owner, repo, ref)
      const configuredEcosystems =
        this.getConfiguredEcosystems(dependabotConfig)
      this.validateEcosystems(supportedEcosystems, configuredEcosystems)
    } catch (error) {
      if (error instanceof Error) {
        core.setFailed(`No .github/dependabot.yml file found. ${error.message}`)
      } else {
        core.setFailed('No .github/dependabot.yml file found.')
      }
    }
  }

  private async getDependabotConfig(
    owner: string,
    repo: string,
    ref: string
  ): Promise<DependabotConfig> {
    const { data: dependabotConfig } = await this.octokit.rest.repos.getContent(
      {
        owner,
        repo,
        path: '.github/dependabot.yml',
        ref
      }
    )

    if (!('content' in dependabotConfig)) {
      throw new Error('Invalid dependabot.yml content')
    }

    return yaml.load(
      Buffer.from(dependabotConfig.content, 'base64').toString()
    ) as DependabotConfig
  }

  private getConfiguredEcosystems(config: DependabotConfig): Set<string> {
    if (!config || !config.updates || !Array.isArray(config.updates)) {
      throw new Error(
        'Invalid dependabot.yml: Missing or invalid "updates" configuration'
      )
    }

    return new Set(config.updates.map(u => u['package-ecosystem']))
  }

  private validateEcosystems(
    supported: Set<string>,
    configured: Set<string>
  ): void {
    const missingEcosystems = [...supported].filter(eco => !configured.has(eco))

    if (missingEcosystems.length > 0) {
      core.setFailed(
        `Missing Dependabot configuration for ecosystems: ${missingEcosystems.join(', ')}`
      )
    } else {
      core.info('All supported ecosystems are configured in dependabot.yml')
    }
  }
}