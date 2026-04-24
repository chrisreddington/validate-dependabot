/**
 * Unit tests for the DependabotValidator class
 * Tests the validation of dependabot.yml configurations
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { DependabotValidator } from '../src/dependabot-validator'
import { vi, describe, test, expect, beforeEach } from 'vitest'

vi.mock('@actions/core')

/** Helpers for building base64-encoded YAML content */
function toBase64(yaml: string): string {
  return Buffer.from(yaml).toString('base64')
}

const BASE_CONFIG = `
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
`.trim()

const CONFIG_WITH_COOLDOWN = `
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      semver-patch-days: 3
`.trim()

const CONFIG_WITH_ALL = `
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      semver-patch-days: 3
    groups:
      npm-all:
        update-types:
          - patch
`.trim()

const CONFIG_MULTI_ECOSYSTEM = `
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      semver-patch-days: 3
    groups:
      npm-all:
        update-types:
          - patch
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      default-days: 7
    groups:
      actions-all:
        update-types:
          - patch
`.trim()

const CONFIG_PARTIAL_COOLDOWN = `
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      semver-patch-days: 3
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
`.trim()

/**
 * Test suite for the DependabotValidator class
 */
describe('DependabotValidator', () => {
  // Setup test environment and mocks
  const mockSetFailed = vi.mocked(core.setFailed)
  const mockInfo = vi.mocked(core.info)

  const mockGetContent = vi.fn()
  const mockOctokit = {
    rest: {
      repos: {
        getContent: mockGetContent
      }
    }
  } as unknown as ReturnType<typeof github.getOctokit>

  const validator = new DependabotValidator(mockOctokit)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ecosystem configuration validation', () => {
    test('accepts valid dependabot configuration', async () => {
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(BASE_CONFIG) }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm'])
      )

      expect(mockSetFailed).not.toHaveBeenCalled()
      expect(mockInfo).toHaveBeenCalledWith(
        'All supported ecosystems are configured in dependabot.yml'
      )
    })

    test('reports missing required ecosystems', async () => {
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(BASE_CONFIG) }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm', 'pip'])
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        'Missing Dependabot configuration for ecosystems: pip'
      )
    })
  })

  describe('cooldown validation', () => {
    test('passes when cooldown is present and require-cooldown is true', async () => {
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(CONFIG_WITH_COOLDOWN) }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireCooldown: true }
      )

      expect(mockSetFailed).not.toHaveBeenCalled()
      expect(mockInfo).toHaveBeenCalledWith(
        'All ecosystems have cooldown configured in dependabot.yml'
      )
    })

    test('fails when cooldown is missing and require-cooldown is true', async () => {
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(BASE_CONFIG) }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireCooldown: true }
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        'Missing cooldown configuration for ecosystems: npm'
      )
    })

    test('reports all ecosystems missing cooldown in a single failure', async () => {
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(CONFIG_PARTIAL_COOLDOWN) }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireCooldown: true }
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        'Missing cooldown configuration for ecosystems: github-actions'
      )
      expect(mockSetFailed).toHaveBeenCalledTimes(1)
    })

    test('skips cooldown validation when require-cooldown is false', async () => {
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(BASE_CONFIG) }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireCooldown: false }
      )

      expect(mockSetFailed).not.toHaveBeenCalled()
    })

    test('skips cooldown validation when options are not provided', async () => {
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(BASE_CONFIG) }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm'])
      )

      expect(mockSetFailed).not.toHaveBeenCalled()
    })

    test('fails when cooldown key is present but null', async () => {
      mockGetContent.mockResolvedValue({
        data: {
          content: toBase64(
            'updates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "weekly"\n    cooldown:'
          )
        }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireCooldown: true }
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        'Missing cooldown configuration for ecosystems: npm'
      )
    })

    test('fails when cooldown is an empty object', async () => {
      mockGetContent.mockResolvedValue({
        data: {
          content: toBase64(
            'updates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "weekly"\n    cooldown: {}'
          )
        }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireCooldown: true }
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        'Missing cooldown configuration for ecosystems: npm'
      )
    })

    test('accepts cooldown with only default-days set', async () => {
      mockGetContent.mockResolvedValue({
        data: {
          content: toBase64(
            'updates:\n  - package-ecosystem: "github-actions"\n    directory: "/"\n    schedule:\n      interval: "weekly"\n    cooldown:\n      default-days: 7'
          )
        }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set([]),
        { requireCooldown: true }
      )

      expect(mockSetFailed).not.toHaveBeenCalled()
    })
  })

  describe('groups validation', () => {
    test('passes when groups are present and require-groups is true', async () => {
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(CONFIG_WITH_ALL) }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireGroups: true }
      )

      expect(mockSetFailed).not.toHaveBeenCalled()
      expect(mockInfo).toHaveBeenCalledWith(
        'All ecosystems have groups configured in dependabot.yml'
      )
    })

    test('fails when groups are missing and require-groups is true', async () => {
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(BASE_CONFIG) }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireGroups: true }
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        'Missing groups configuration for ecosystems: npm'
      )
    })

    test('skips groups validation when require-groups is false', async () => {
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(BASE_CONFIG) }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireGroups: false }
      )

      expect(mockSetFailed).not.toHaveBeenCalled()
    })

    test('fails when groups key is present but null', async () => {
      mockGetContent.mockResolvedValue({
        data: {
          content: toBase64(
            'updates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "weekly"\n    groups:'
          )
        }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireGroups: true }
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        'Missing groups configuration for ecosystems: npm'
      )
    })

    test('fails when groups is an empty object', async () => {
      mockGetContent.mockResolvedValue({
        data: {
          content: toBase64(
            'updates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "weekly"\n    groups: {}'
          )
        }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireGroups: true }
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        'Missing groups configuration for ecosystems: npm'
      )
    })
  })

  describe('combined cooldown and groups validation', () => {
    test('passes when both are present and both flags are true', async () => {
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(CONFIG_MULTI_ECOSYSTEM) }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireCooldown: true, requireGroups: true }
      )

      expect(mockSetFailed).not.toHaveBeenCalled()
    })

    test('validates all ecosystems including github-actions, not just detected ones', async () => {
      // npm has cooldown + groups; github-actions has neither
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(CONFIG_WITH_ALL) }
      })

      // Only 'npm' detected from languages — but github-actions isn't in dependabot here,
      // so let's test with CONFIG_PARTIAL_COOLDOWN where github-actions lacks cooldown
      mockGetContent.mockResolvedValue({
        data: { content: toBase64(CONFIG_PARTIAL_COOLDOWN) }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']), // Only npm detected, but github-actions entry still validated
        { requireCooldown: true }
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        'Missing cooldown configuration for ecosystems: github-actions'
      )
    })
  })

  describe('error handling', () => {
    test('handles invalid YAML configuration', async () => {
      mockGetContent.mockResolvedValue({
        data: {
          content: Buffer.from('# Empty configuration').toString('base64')
        }
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm'])
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining(
          'Invalid dependabot.yml: Missing or invalid "updates" configuration'
        )
      )
    })

    test('handles missing content in GitHub API response', async () => {
      mockGetContent.mockResolvedValue({
        data: {} // Missing content field
      })

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm'])
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining(
          'No .github/dependabot.yml file found. Invalid dependabot.yml content'
        )
      )
    })

    test('handles unexpected errors during validation', async () => {
      mockGetContent.mockRejectedValue('String error')

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm'])
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        'No .github/dependabot.yml file found.'
      )
    })

    test('does not run cooldown validation when dependabot.yml is missing', async () => {
      mockGetContent.mockRejectedValue(new Error('Not Found'))

      await validator.validateConfiguration(
        'owner',
        'repo',
        'main',
        new Set(['npm']),
        { requireCooldown: true }
      )

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('No .github/dependabot.yml file found.')
      )
      // Should NOT additionally fail with a cooldown message
      expect(mockSetFailed).toHaveBeenCalledTimes(1)
    })
  })
})
