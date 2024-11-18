import * as core from '@actions/core'
import * as github from '@actions/github'
import { DependabotValidator } from '../src/dependabot-validator'

jest.mock('@actions/core')

describe('DependabotValidator', () => {
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

  test('validates correct configuration', async () => {
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

  test('fails on missing ecosystems', async () => {
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

  test('fails on invalid configuration', async () => {
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
})
