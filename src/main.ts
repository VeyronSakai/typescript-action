import * as core from '@actions/core'
import * as github from '@actions/github'
import { wait } from './wait.js'

interface ActionInputs {
  token: string
  milliseconds: string
  exampleInput: string
}

interface ActionOutputs {
  time: string
  result: string
  processed: boolean
}

/**
 * Validates and retrieves action inputs with proper error handling
 */
function getActionInputs(): ActionInputs {
  const token = core.getInput('token')
  const milliseconds = core.getInput('milliseconds') || '1000'
  const exampleInput = core.getInput('example-input') || 'default'

  // Validate required inputs
  if (!token) {
    throw new Error('Input required and not supplied: token')
  }

  // Validate milliseconds input
  const ms = parseInt(milliseconds, 10)
  if (isNaN(ms) || ms < 0) {
    throw new Error(
      `Invalid milliseconds value: ${milliseconds}. Must be a non-negative number.`
    )
  }

  core.info(
    `Validated inputs: milliseconds=${milliseconds}, example-input=${exampleInput}`
  )

  return {
    token,
    milliseconds,
    exampleInput
  }
}

/**
 * Demonstrates GitHub API usage with proper error handling and rate limiting
 */
async function processWithGitHubAPI(
  inputs: ActionInputs
): Promise<ActionOutputs> {
  const octokit = github.getOctokit(inputs.token)

  try {
    core.info('Starting GitHub API processing...')

    // Example: Get repository information
    const { data: repo } = await octokit.rest.repos.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo
    })

    core.info(`Processing repository: ${repo.full_name}`)

    // Simulate processing with wait
    const ms = parseInt(inputs.milliseconds, 10)
    core.info(`Processing for ${ms} milliseconds...`)
    await wait(ms)

    const result = `Processed ${inputs.exampleInput} for ${repo.full_name}`

    return {
      time: new Date().toTimeString(),
      result,
      processed: true
    }
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific GitHub API errors
      if (error.message.includes('rate limit')) {
        core.warning('Rate limit encountered. Consider adding retry logic.')
        throw new Error(
          'GitHub API rate limit exceeded. Please try again later.'
        )
      }

      if (error.message.includes('Not Found')) {
        throw new Error(
          'Repository not found or token lacks necessary permissions.'
        )
      }

      // Re-throw with context
      throw new Error(`GitHub API error: ${error.message}`)
    }

    throw error
  }
}

/**
 * Sets action outputs with proper typing
 */
function setActionOutputs(outputs: ActionOutputs): void {
  core.setOutput('time', outputs.time)
  core.setOutput('result', outputs.result)
  core.setOutput('processed', outputs.processed.toString())

  core.info(`Action completed successfully with result: ${outputs.result}`)
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.info('Starting TypeScript Action...')

    // Validate and get inputs
    const inputs = getActionInputs()

    // Process with GitHub API
    const outputs = await processWithGitHubAPI(inputs)

    // Set outputs
    setActionOutputs(outputs)

    core.info('TypeScript Action completed successfully!')
  } catch (error) {
    // Comprehensive error handling
    if (error instanceof Error) {
      core.error(`Action failed: ${error.message}`)

      // Log stack trace for debugging
      if (error.stack) {
        core.debug(`Stack trace: ${error.stack}`)
      }

      core.setFailed(error.message)
    } else {
      const errorMessage = 'An unexpected error occurred'
      core.error(errorMessage)
      core.setFailed(errorMessage)
    }
  }
}
