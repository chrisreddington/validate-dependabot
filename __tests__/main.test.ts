import * as core from '@actions/core'
import * as github from '@actions/github'
import { Context } from '@actions/github/lib/context'
import { run } from '../src/main'

jest.mock('@actions/core')
jest.mock('@actions/github')

const mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>
const mockSetFailed = core.setFailed as jest.MockedFunction<
  typeof core.setFailed
>
const mockInfo = core.info as jest.MockedFunction<typeof core.info>

describe('validate-dependabot', () => {
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

  test('succeeds when all supported ecosystems are configured', async () => {
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
    expect(mockInfo).toHaveBeenCalledWith(
      'All supported ecosystems are configured in dependabot.yml'
    )
  })

  test('fails when dependabot.yml is missing', async () => {
    mockOctokit.rest.repos.listLanguages.mockResolvedValue({
      data: { JavaScript: 1 }
    })

    mockOctokit.rest.repos.getContent.mockRejectedValue(new Error('Not found'))

    await run()

    expect(mockSetFailed).toHaveBeenCalledWith(
      expect.stringContaining('No .github/dependabot.yml file found')
    )
  })

  test('fails when supported ecosystem is not configured', async () => {
    mockOctokit.rest.repos.listLanguages.mockResolvedValue({
      data: { JavaScript: 1, Python: 1 }
    })

    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: {
        content: Buffer.from(
          'updates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "daily"'
        ).toString('base64')
      }
    })

    await run()

    expect(mockSetFailed).toHaveBeenCalledWith(
      expect.stringContaining(
        'Missing Dependabot configuration for ecosystems: pip'
      )
    )
  })

  test('succeeds when no supported languages are found', async () => {
    mockOctokit.rest.repos.listLanguages.mockResolvedValue({
      data: { Brainfuck: 1 }
    })

    await run()

    expect(mockSetFailed).not.toHaveBeenCalled()
    expect(mockInfo).toHaveBeenCalledWith(
      'No supported Dependabot ecosystems found for this repository'
    )
  })

  test('handles API errors gracefully', async () => {
    mockOctokit.rest.repos.listLanguages.mockRejectedValue(
      new Error('API error')
    )

    await run()

    expect(mockSetFailed).toHaveBeenCalledWith('API error')
  })
})
