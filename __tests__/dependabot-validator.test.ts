/**
 * Unit tests for the DependabotValidator class
 * Tests the validation of dependabot.yml configurations
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { DependabotValidator } from '../src/dependabot-validator'

jest.mock('@actions/core')

/**
 * Test suite for the DependabotValidator class
 */
describe('DependabotValidator', () => {
  // Setup test environment and mocks
  const mockSetFailed = jest.mocked(core.setFailed)
  const mockInfo = jest.mocked(core.info)

  const mockGetContent = jest.fn()
  const mockOctokit = {
    rest: {
      repos: {
        getContent: mockGetContent
      }
    }
  } as unknown as ReturnType<typeof github.getOctokit>

  const validator = new DependabotValidator(mockOctokit)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('configuration validation', () => {
    test('accepts valid dependabot configuration', async () => {
      mockGetContent.mockResolvedValue({
        data: {
          content: Buffer.from(
            'updates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "daily"'
          ).toString('base64')
        }
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
        data: {
          content: Buffer.from(
            'updates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "daily"'
          ).toString('base64')
        }
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
  })
})
