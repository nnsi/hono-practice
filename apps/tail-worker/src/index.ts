type Env = {
  LOGS: AnalyticsEngineDataset;
};

export type LogEntry = {
  level?: string;
  msg?: string;
  requestId?: string;
  method?: string;
  path?: string;
  feature?: string;
  status?: number;
  duration?: number;
  error?: string;
  dbMs?: number;
  r2Ms?: number;
  kvMs?: number;
  extMs?: number;
  spanCount?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOptionalString(
  entry: Record<string, unknown>,
  field: string,
): boolean {
  return entry[field] === undefined || typeof entry[field] === "string";
}

function hasOptionalNumber(
  entry: Record<string, unknown>,
  field: string,
): boolean {
  return (
    entry[field] === undefined ||
    (typeof entry[field] === "number" && Number.isFinite(entry[field]))
  );
}

function isLogEntry(value: unknown): value is LogEntry {
  if (!isRecord(value)) return false;
  return (
    hasOptionalString(value, "level") &&
    hasOptionalString(value, "msg") &&
    hasOptionalString(value, "requestId") &&
    hasOptionalString(value, "method") &&
    hasOptionalString(value, "path") &&
    hasOptionalString(value, "feature") &&
    hasOptionalString(value, "error") &&
    hasOptionalNumber(value, "status") &&
    hasOptionalNumber(value, "duration") &&
    hasOptionalNumber(value, "dbMs") &&
    hasOptionalNumber(value, "r2Ms") &&
    hasOptionalNumber(value, "kvMs") &&
    hasOptionalNumber(value, "extMs") &&
    hasOptionalNumber(value, "spanCount")
  );
}

function parseJson(message: string): Promise<unknown> {
  return Promise.resolve(message).then((serialized): unknown =>
    JSON.parse(serialized),
  );
}

export const parseLogMessage = (message: string): Promise<LogEntry | null> =>
  parseJson(message).then(
    (parsed) => (isLogEntry(parsed) ? parsed : null),
    () => null,
  );

function serializeTraceMessage(message: unknown): string {
  if (Array.isArray(message) && message.length === 1) {
    return String(message[0]);
  }
  return JSON.stringify(message) ?? "";
}

/** WAEに書き込む対象のログかどうかを判定 */
export const shouldWrite = (entry: LogEntry): boolean =>
  entry.level === "error" ||
  (entry.msg === "Response sent" && entry.status !== 404);

export default {
  async tail(events: TraceItem[], env: Env): Promise<void> {
    for (const event of events) {
      for (const log of event.logs) {
        const entry = await parseLogMessage(serializeTraceMessage(log.message));
        if (!entry) continue;
        if (!shouldWrite(entry)) continue;

        env.LOGS.writeDataPoint({
          blobs: [
            entry.level ?? "info", // blob1: ログレベル
            entry.msg ?? "", // blob2: メッセージ
            entry.requestId ?? "", // blob3: リクエストID
            entry.method ?? "", // blob4: HTTPメソッド
            entry.path ?? "", // blob5: パス
            entry.feature ?? "", // blob6: feature名
            entry.error ?? "", // blob7: エラー内容
          ],
          doubles: [
            entry.status ?? 0, // double1: HTTPステータス
            entry.duration ?? 0, // double2: 総リクエスト時間 (ms)
            entry.dbMs ?? 0, // double3: DB合計時間 (ms)
            entry.r2Ms ?? 0, // double4: R2合計時間 (ms)
            entry.kvMs ?? 0, // double5: KV合計時間 (ms)
            entry.extMs ?? 0, // double6: 外部API合計時間 (ms)
            entry.spanCount ?? 0, // double7: スパン数
          ],
          indexes: [
            entry.level ?? "info", // index1: ログレベル (フィルタ用)
          ],
        });
      }
    }
  },
};
