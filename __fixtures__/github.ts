/**
 * Fixtures for the @actions/github module
 */
import { jest } from '@jest/globals'

export const getOctokit = jest.fn()

export const context = {
  repo: {
    owner: 'owner',
    repo: 'repo'
  },
  payload: {},
  eventName: 'push',
  sha: 'abc123',
  ref: 'refs/heads/main',
  workflow: 'test',
  action: 'test',
  actor: 'test-user',
  job: 'test-job',
  runNumber: 1,
  runId: 1
}

export default {
  getOctokit,
  context
}
