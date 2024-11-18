import * as core from '@actions/core'
import * as github from '@actions/github'
import { Context } from '@actions/github/lib/context'
import { run } from '../src/main'

jest.mock('@actions/core')
jest.mock('@actions/github')

describe('validate-dependabot integration', () => {
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

  test('handles complete happy path', async () => {
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

  test('handles API errors gracefully', async () => {
    mockOctokit.rest.repos.listLanguages.mockRejectedValue(
      new Error('API error')
    )

    await run()

    expect(mockSetFailed).toHaveBeenCalledWith('API error')
  })
})
