import type { SyncPostResponse } from "./syncHttpResponseValidation";

export type SyncHttpDisposition = "retryable" | "permanent";

export function classifySyncHttpStatus(status: number): SyncHttpDisposition {
  return status === 400 || status === 422 ? "permanent" : "retryable";
}

export class SyncHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfterMs?: number,
  ) {
    super(`sync request failed: ${status}`);
  }
}

function retryAfterMs(response: SyncPostResponse, attempt: number): number {
  const header = response.headers?.get("Retry-After");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 30_000);
    }
    const date = Date.parse(header);
    if (Number.isFinite(date)) {
      return Math.min(Math.max(0, date - Date.now()), 30_000);
    }
  }
  return Math.min(1000 * 2 ** attempt, 30_000);
}

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function postSyncChunkWithRetry<T, K>(options: {
  activities: T[];
  activityKinds: K[];
  post(activities: T[], activityKinds: K[]): Promise<SyncPostResponse>;
  sleep?: (milliseconds: number) => Promise<void>;
  max429Retries?: number;
}): Promise<SyncPostResponse> {
  const sleep = options.sleep ?? defaultSleep;
  const max429Retries = options.max429Retries ?? 1;
  let response = await options.post(options.activities, options.activityKinds);

  for (
    let attempt = 0;
    response.status === 429 && attempt < max429Retries;
    attempt += 1
  ) {
    await sleep(retryAfterMs(response, attempt));
    response = await options.post(options.activities, options.activityKinds);
  }

  if (!response.ok && classifySyncHttpStatus(response.status) === "retryable") {
    throw new SyncHttpError(
      response.status,
      response.status === 429
        ? retryAfterMs(response, max429Retries)
        : undefined,
    );
  }
  return response;
}
