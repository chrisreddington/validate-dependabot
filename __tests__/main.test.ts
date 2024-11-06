/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as main from '../src/main'

// Mock the GitHub Actions core library
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
const infoMock = jest.spyOn(core, 'info')

// Mock the GitHub API
const listLanguagesMock = jest.fn()
const getContentMock = jest.fn()

jest.mock('@actions/github', () => ({
  getOctokit: jest.fn(() => ({
    rest: {
      repos: {
        listLanguages: (...args: any[]) => listLanguagesMock(...args),
        getContent: (...args: any[]) => getContentMock(...args)
      }
    }
  })),
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    }
  }
}))

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    debugMock = jest.spyOn(core, 'debug').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
    jest.clearAllMocks()
    getInputMock.mockImplementation((name: string) => {
      if (name === 'github-token') return 'mock-token'
      return ''
    })
  })

  it('validates repository with matching Dependabot configuration', async () => {
    listLanguagesMock.mockResolvedValue({
      data: { JavaScript: 100, TypeScript: 50 }
    })
    getContentMock.mockResolvedValue({
      data: {
        content: Buffer.from(
          'updates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "daily"'
        ).toString('base64')
      }
    })

    await main.run()

    expect(infoMock).toHaveBeenCalledWith(
      'Found languages: JavaScript, TypeScript'
    )
    expect(infoMock).toHaveBeenCalledWith('Supported ecosystems: npm')
    expect(infoMock).toHaveBeenCalledWith(
      'All supported ecosystems are configured in dependabot.yml'
    )
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('fails when Dependabot configuration is missing', async () => {
    listLanguagesMock.mockResolvedValue({
      data: { JavaScript: 100 }
    })
    getContentMock.mockRejectedValue(new Error('Not found'))

    await main.run()

    expect(setFailedMock).toHaveBeenCalledWith(
      'No .github/dependabot.yml file found'
    )
  })
})
