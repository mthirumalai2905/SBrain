export async function withRetry<T>(run: (attempt: number) => Promise<T>, attempts = 3, wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))) {
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await run(attempt);
    } catch (error) {
      last = error;
      const retryable = error instanceof RetryableError;
      if (!retryable || attempt === attempts - 1) throw error;
      await wait(200 * 2 ** attempt);
    }
  }
  throw last;
}

export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}
