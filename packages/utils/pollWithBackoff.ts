export type PollSleep = (
  milliseconds: number,
  signal?: AbortSignal,
) => Promise<void>;

export type PollWithBackoffOptions<T> = {
  operation: (attempt: number) => Promise<T>;
  accept: (value: T) => boolean;
  maxAttempts?: number;
  initialDelayMs?: number;
  sleep?: PollSleep;
  signal?: AbortSignal;
};

export type PollWithBackoffResult<T> =
  | { matched: true; value: T; attempts: number }
  | { matched: false; value: T | undefined; attempts: number };

type AttemptResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

export class PollingCancelledError extends Error {
  constructor() {
    super("polling was cancelled");
  }
}

function cancellationError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new PollingCancelledError();
}

function throwIfCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw cancellationError(signal);
}

const defaultSleep: PollSleep = (milliseconds, signal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(cancellationError(signal));
      return;
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);
    const handleAbort = () => {
      clearTimeout(timeout);
      reject(signal ? cancellationError(signal) : new PollingCancelledError());
    };
    signal?.addEventListener("abort", handleAbort, { once: true });
  });

export async function pollWithExponentialBackoff<T>(
  options: PollWithBackoffOptions<T>,
): Promise<PollWithBackoffResult<T>> {
  const maxAttempts = options.maxAttempts ?? 6;
  const initialDelayMs = options.initialDelayMs ?? 500;
  const sleep = options.sleep ?? defaultSleep;
  let lastValue: T | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    throwIfCancelled(options.signal);
    const result: AttemptResult<T> = await options.operation(attempt).then(
      (value): AttemptResult<T> => ({ ok: true, value }),
      (error: unknown): AttemptResult<T> => ({ ok: false, error }),
    );
    throwIfCancelled(options.signal);

    if (result.ok) {
      lastValue = result.value;
      if (options.accept(result.value)) {
        return { matched: true, value: result.value, attempts: attempt + 1 };
      }
    }

    if (attempt + 1 < maxAttempts) {
      const delay = initialDelayMs * 2 ** attempt;
      if (options.signal) await sleep(delay, options.signal);
      else await sleep(delay);
      throwIfCancelled(options.signal);
    }
  }

  return { matched: false, value: lastValue, attempts: maxAttempts };
}
