/**
 * Unit tests for the ecosystem-mapping module
 * Tests the mapping between programming languages and their package ecosystems
 */

import { getEcosystemLanguageMapping } from '../src/ecosystem-mapping'

jest.mock('@actions/core')

/**
 * Test suite for the ecosystem mapping functionality
 */
describe('ecosystem-mapping module', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('language mapping', () => {
    test('correctly maps supported programming languages to package ecosystems', () => {
      const repoLanguages = ['JavaScript', 'TypeScript', 'Python']
      const mapping = getEcosystemLanguageMapping(repoLanguages)

      expect(mapping.get('npm')).toEqual(['JavaScript', 'TypeScript'])
      expect(mapping.get('pip')).toEqual(['Python'])
    })

    test('handles unsupported programming languages gracefully', () => {
      const repoLanguages = ['UnsupportedLanguage']
      const mapping = getEcosystemLanguageMapping(repoLanguages)

      expect(mapping.size).toBe(0)
    })
  })
})
