type HeadersLike = {
  get(name: string): string | null;
};

type ResponseLike = {
  headers?: HeadersLike | null;
};

const SYNC_WATERMARK_SAFETY_MS = 1000;

let serverOffsetMs = 0;
let hasServerOffset = false;
let lastIssuedServerTimeMs = 0;

function parseServerDateHeader(
  dateHeader: string | null | undefined,
): number | null {
  if (!dateHeader) return null;
  const parsed = Date.parse(dateHeader);
  return Number.isNaN(parsed) ? null : parsed;
}

function updateLogicalServerTime(serverTimeMs: number): void {
  if (serverTimeMs > lastIssuedServerTimeMs) {
    lastIssuedServerTimeMs = serverTimeMs;
  }
}

export function trackServerTimeHeader(
  dateHeader: string | null | undefined,
): void {
  const serverTimeMs = parseServerDateHeader(dateHeader);
  if (serverTimeMs === null) return;
  hasServerOffset = true;
  serverOffsetMs = serverTimeMs - Date.now();
  updateLogicalServerTime(serverTimeMs);
}

export function trackServerTimeFromResponse(
  response: ResponseLike | null | undefined,
): void {
  trackServerTimeHeader(response?.headers?.get("date"));
}

export function getServerNowISOString(): string {
  const estimatedServerNowMs = hasServerOffset
    ? Date.now() + serverOffsetMs
    : Date.now();
  const nextServerNowMs = Math.max(
    estimatedServerNowMs,
    lastIssuedServerTimeMs + 1,
  );
  lastIssuedServerTimeMs = nextServerNowMs;
  return new Date(nextServerNowMs).toISOString();
}

export function getSafeSyncWatermarkISOString(
  responses: Array<ResponseLike | null | undefined>,
): string {
  const serverTimes = responses
    .map((response) => parseServerDateHeader(response?.headers?.get("date")))
    .filter((timeMs): timeMs is number => timeMs !== null);

  if (serverTimes.length === 0) {
    return getServerNowISOString();
  }

  const earliestServerTimeMs = Math.min(...serverTimes);
  const safeServerTimeMs = Math.max(
    0,
    earliestServerTimeMs - SYNC_WATERMARK_SAFETY_MS,
  );
  updateLogicalServerTime(earliestServerTimeMs);
  return new Date(safeServerTimeMs).toISOString();
}

export function resetServerTimeForTests(): void {
  serverOffsetMs = 0;
  hasServerOffset = false;
  lastIssuedServerTimeMs = 0;
}
