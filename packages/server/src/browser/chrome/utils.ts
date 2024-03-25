import { z } from "zod";

type FetchJsonOptions<T> = {
  url: string | URL;
  schema: z.ZodType<T>;
  maxDelayInMs?: number;
  retries?: number;
  timeoutInMs?: number;
};

const DEFAULT_TIMEOUT_MS = 5 * 1000;
const DEFAULT_MAX_DELAY_MS = 2.5 * 1000;
const PROMISE_THAT_NEVER_RESOLVES = new Promise<void>(() => {});

export async function fetchJson<T>(
  options: FetchJsonOptions<T>,
): Promise<T | void> {
  const {
    url,
    schema,
    maxDelayInMs = DEFAULT_MAX_DELAY_MS,
    timeoutInMs = DEFAULT_TIMEOUT_MS,
  } = options;
  let { retries = 0 } = options;

  let nextDelayMs = 100;

  while (retries >= 0) {
    const abortController = new AbortController();

    const fetchPromise = fetch(url.toString(), {
      signal: abortController.signal,
    });

    const resp = await Promise.race([
      fetchPromise,
      timeoutInMs
        ? delay(timeoutInMs).then(() => abortController.abort())
        : PROMISE_THAT_NEVER_RESOLVES,
    ]).catch(async (err) => {
      if (err instanceof TypeError) {
        return;
      }

      throw err;
    });

    if (!resp) {
      retries -= 1;

      if (retries >= 0) {
        nextDelayMs = Math.min(nextDelayMs * 2, maxDelayInMs);
        await delay(nextDelayMs);
      }

      continue;
    }

    try {
      return schema.parse(await resp.json());
    } catch {
      return;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
