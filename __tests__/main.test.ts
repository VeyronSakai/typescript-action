/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import * as github from '../__fixtures__/github.js'
import { wait } from '../__fixtures__/wait.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => github)
jest.unstable_mockModule('../src/wait.js', () => ({ wait }))

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks()

    // Set default mock implementations
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'token':
          return 'mock-github-token'
        case 'milliseconds':
          return '500'
        case 'example-input':
          return 'test-input'
        default:
          return ''
      }
    })

    // Mock the wait function so that it does not actually wait.
    wait.mockImplementation(() => Promise.resolve('done!'))

    // Mock GitHub API responses using any to bypass type checking
    const mockGet = jest.fn() as jest.MockedFunction<any>
    mockGet.mockResolvedValue({
      data: {
        full_name: 'owner/repo',
        name: 'repo',
        owner: { login: 'owner' }
      }
    })

    github.getOctokit.mockReturnValue({
      rest: {
        repos: {
          get: mockGet
        }
      }
    } as any)

    // Mock GitHub context is set in the fixture file
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Happy path scenarios', () => {
    it('successfully processes with valid inputs', async () => {
      await run()

      // Verify all outputs were set
      expect(core.setOutput).toHaveBeenCalledWith(
        'time',
        expect.stringMatching(/^\d{2}:\d{2}:\d{2}/)
      )
      expect(core.setOutput).toHaveBeenCalledWith(
        'result',
        'Processed test-input for owner/repo'
      )
      expect(core.setOutput).toHaveBeenCalledWith('processed', 'true')

      // Verify info logging
      expect(core.info).toHaveBeenCalledWith('Starting TypeScript Action...')
      expect(core.info).toHaveBeenCalledWith(
        'TypeScript Action completed successfully!'
      )
    })

    it('uses default values for optional inputs', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'token':
            return 'mock-github-token'
          case 'milliseconds':
            return '' // Empty string should use default
          case 'example-input':
            return '' // Empty string should use default
          default:
            return ''
        }
      })

      await run()

      expect(core.setOutput).toHaveBeenCalledWith(
        'result',
        'Processed default for owner/repo'
      )
    })
  })

  describe('Input validation', () => {
    it('fails when token is missing', async () => {
      core.getInput.mockImplementation((name: string) => {
        if (name === 'token') return ''
        return 'valid-value'
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'Input required and not supplied: token'
      )
      expect(core.error).toHaveBeenCalledWith(
        'Action failed: Input required and not supplied: token'
      )
    })

    it('fails with invalid milliseconds value', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'token':
            return 'mock-github-token'
          case 'milliseconds':
            return 'not-a-number'
          default:
            return 'valid-value'
        }
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'Invalid milliseconds value: not-a-number. Must be a non-negative number.'
      )
    })

    it('fails with negative milliseconds value', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'token':
            return 'mock-github-token'
          case 'milliseconds':
            return '-500'
          default:
            return 'valid-value'
        }
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'Invalid milliseconds value: -500. Must be a non-negative number.'
      )
    })
  })

  describe('GitHub API error handling', () => {
    it('handles rate limit errors gracefully', async () => {
      const mockGet = jest.fn() as jest.MockedFunction<any>
      mockGet.mockRejectedValue(new Error('API rate limit exceeded'))

      github.getOctokit.mockReturnValue({
        rest: {
          repos: {
            get: mockGet
          }
        }
      } as any)

      await run()

      expect(core.warning).toHaveBeenCalledWith(
        'Rate limit encountered. Consider adding retry logic.'
      )
      expect(core.setFailed).toHaveBeenCalledWith(
        'GitHub API rate limit exceeded. Please try again later.'
      )
    })

    it('handles repository not found errors', async () => {
      const mockGet = jest.fn() as jest.MockedFunction<any>
      mockGet.mockRejectedValue(new Error('Not Found'))

      github.getOctokit.mockReturnValue({
        rest: {
          repos: {
            get: mockGet
          }
        }
      } as any)

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'Repository not found or token lacks necessary permissions.'
      )
    })
  })

  describe('Output validation', () => {
    it('sets all expected outputs with correct types', async () => {
      await run()

      // Verify time output format
      const timeCall = core.setOutput.mock.calls.find(
        (call) => call[0] === 'time'
      )
      expect(timeCall?.[1]).toMatch(/^\d{2}:\d{2}:\d{2}/)

      // Verify result output content
      const resultCall = core.setOutput.mock.calls.find(
        (call) => call[0] === 'result'
      )
      expect(resultCall?.[1]).toBe('Processed test-input for owner/repo')

      // Verify processed output is string boolean
      const processedCall = core.setOutput.mock.calls.find(
        (call) => call[0] === 'processed'
      )
      expect(processedCall?.[1]).toBe('true')
    })
  })
})
