import { getEcosystemLanguageMapping } from '../src/ecosystem-mapping'

jest.mock('@actions/core')

describe('ecosystem-mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('maps supported languages correctly', () => {
    const repoLanguages = ['JavaScript', 'TypeScript', 'Python']
    const mapping = getEcosystemLanguageMapping(repoLanguages)

    expect(mapping.get('npm')).toEqual(['JavaScript', 'TypeScript'])
    expect(mapping.get('pip')).toEqual(['Python'])
  })

  test('handles unsupported languages', () => {
    const repoLanguages = ['UnsupportedLanguage']
    const mapping = getEcosystemLanguageMapping(repoLanguages)

    expect(mapping.size).toBe(0)
  })
})
