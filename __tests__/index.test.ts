/**
 * Unit tests for the action's entrypoint (index.ts)
 * Verifies that the action's main function is called when the module is imported
 */

import * as main from '../src/main'

// Mock the action's entrypoint
const runMock = jest.spyOn(main, 'run').mockImplementation()

/**
 * Test suite for the index module
 */
describe('index module', () => {
  test('should call run function when module is imported', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/index')

    expect(runMock).toHaveBeenCalled()
  })
})
