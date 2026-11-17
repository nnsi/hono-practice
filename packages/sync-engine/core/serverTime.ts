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

/**
 * サーバーが保存した updatedAt を観測したら、以後に発行する時刻を必ずそれより後にする。
 *
 * サーバーは push を受理すると updatedAt を自分の時刻へ繰り上げる。Date ヘッダーは
 * 秒精度で、端末時計もずれうるため、推定サーバー時刻だけでは同じ行の次の編集に
 * 保存済みより古い時刻を付けてしまい、サーバーに「古い更新」として捨てられる。
 */
export function trackServerTimestamps(
  timestamps: Iterable<string | null | undefined>,
): void {
  for (const timestamp of timestamps) {
    if (!timestamp) continue;
    const timeMs = Date.parse(timestamp);
    if (!Number.isNaN(timeMs)) updateLogicalServerTime(timeMs);
  }
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
