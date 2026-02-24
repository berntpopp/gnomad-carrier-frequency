/**
 * Retry utility for gnomAD API calls.
 *
 * Implements exponential backoff with jitter to handle transient errors
 * and rate limiting (HTTP 429) from the gnomAD GraphQL API.
 *
 * Error classification:
 * - 429 (rate limited): Always retry, never counts toward retry limit
 * - 4xx (terminal): Throw immediately — bad request, auth error, etc.
 * - 5xx or network error: Retry up to `retries` times with backoff
 */

export interface RetryOptions {
  /** Maximum number of retry attempts for transient errors (default: 3) */
  retries?: number
  /** Initial delay in milliseconds before first retry (default: 1000) */
  baseDelayMs?: number
  /** Maximum delay cap in milliseconds (default: 16000) */
  maxDelayMs?: number
}

/**
 * Parse HTTP status code from error message.
 * The core client throws: new Error(`GraphQL request failed: ${response.status}`)
 * Returns null if no status code can be parsed.
 */
function parseStatusFromError(error: unknown): number | null {
  if (!(error instanceof Error)) return null
  const match = error.message.match(/GraphQL request failed: (\d{3})/)
  if (!match) return null
  return parseInt(match[1], 10)
}

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wrap an async function with exponential backoff retry logic.
 *
 * - On 429: Always retry (rate limit — not counted toward `retries`)
 * - On other 4xx: Throw immediately (terminal client errors)
 * - On 5xx or network error: Retry up to `retries` times
 *
 * Delay formula: min(baseDelayMs * 2^attempt + jitter, maxDelayMs)
 * where jitter = Math.random() * 500 ms
 *
 * @param fn - Async function to execute with retry
 * @param opts - Retry configuration options
 * @returns The result of the first successful call
 * @throws The last error encountered after all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const { retries = 3, baseDelayMs = 1000, maxDelayMs = 16000 } = opts

  let transientAttempt = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn()
    } catch (error) {
      const status = parseStatusFromError(error)

      if (status !== null) {
        // HTTP 429 — rate limited: always retry, don't count against limit
        if (status === 429) {
          const jitter = Math.random() * 500
          const delay = Math.min(baseDelayMs * Math.pow(2, transientAttempt) + jitter, maxDelayMs)
          await sleep(delay)
          // Don't increment transientAttempt for 429s
          continue
        }

        // Other 4xx — terminal client errors (bad request, not found, auth)
        if (status >= 400 && status < 500) {
          throw error
        }
      }

      // 5xx or network error (no status parsed) — transient, retry up to limit
      if (transientAttempt >= retries) {
        throw error
      }

      const jitter = Math.random() * 500
      const delay = Math.min(baseDelayMs * Math.pow(2, transientAttempt) + jitter, maxDelayMs)
      await sleep(delay)
      transientAttempt++
    }
  }
}
