/**
 * Integration tests for the main action functionality
 * Tests the complete workflow of the GitHub Action, including API interactions
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { Context } from '@actions/github/lib/context'
import { run } from '../src/main'

jest.mock('@actions/core')
jest.mock('@actions/github')

/**
 * Main test suite for the validate-dependabot integration
 * Tests various scenarios including successful execution and error handling
 */
describe('validate-dependabot integration', () => {
  // Setup mock implementations
  const mockGetInput = core.getInput as jest.MockedFunction<
    typeof core.getInput
  >
  const mockSetFailed = core.setFailed as jest.MockedFunction<
    typeof core.setFailed
  >
  const mockOctokit = {
    rest: {
      repos: {
        listLanguages: jest.fn(),
        getContent: jest.fn()
      }
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetInput.mockReturnValue('mock-token')
    ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)
    Object.defineProperty(github, 'context', {
      value: {
        repo: {
          owner: 'test-owner',
          repo: 'test-repo'
        }
      } as Partial<Context>,
      configurable: true
    })
  })

  describe('success scenarios', () => {
    test('successfully validates repository with JavaScript and TypeScript', async () => {
      mockOctokit.rest.repos.listLanguages.mockResolvedValue({
        data: { JavaScript: 1, TypeScript: 1 }
      })

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(
            'updates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "daily"'
          ).toString('base64')
        }
      })

      await run()

      expect(mockSetFailed).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    test('gracefully handles GitHub API errors', async () => {
      mockOctokit.rest.repos.listLanguages.mockRejectedValue(
        new Error('API error')
      )

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith('API error')
    })

    test('handles repositories with no supported package ecosystems', async () => {
      mockOctokit.rest.repos.listLanguages.mockResolvedValue({
        data: { NotALanguage: 1 } // A language without Dependabot support
      })

      await run()

      expect(mockSetFailed).not.toHaveBeenCalled()
    })

    test('handles unexpected non-Error exceptions', async () => {
      mockOctokit.rest.repos.listLanguages.mockRejectedValue('String error')

      await run()

      expect(mockSetFailed).not.toHaveBeenCalled()
    })
  })
})
