type Env = {
  LOGS: AnalyticsEngineDataset;
};

type LogEntry = {
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

const parseLogMessage = (message: string): LogEntry | null => {
  try {
    return JSON.parse(message) as LogEntry;
  } catch {
    return null;
  }
};

/** WAEに書き込む対象のログかどうかを判定 */
const shouldWrite = (entry: LogEntry): boolean =>
  entry.level === "error" ||
  (entry.msg === "Response sent" && entry.status !== 404);

/** LogEntryをWAEのデータポイント形状（blobs/doubles/indexes）に変換して書き込む */
const writeLogEntry = (env: Env, entry: LogEntry): void => {
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
};

/**
 * TraceException（未捕捉例外・タイムアウト等）をLogEntryと同じdataset・同じスキーマ形状で書き込む。
 * level は常に "error" 固定。exception.name を blob2 (msg)、exception.message を blob7 (error) にマップする。
 * exception.timestamp はWAEが書き込み時刻を自動記録するため、既存ログ処理と同様に明示的なフィールドへは
 * マップしない（既存のLogEntry処理もtimestampを書き込んでいない）。
 * requestId/method/path/featureやdoubles系（status/duration等）はTraceExceptionから得られないため空/0のまま。
 */
const writeExceptionEntry = (env: Env, exception: TraceException): void => {
  writeLogEntry(env, {
    level: "error",
    msg: exception.name,
    error: exception.message,
  });
};

export default {
  async tail(events: TraceItem[], env: Env): Promise<void> {
    for (const event of events) {
      for (const log of event.logs) {
        const entry = parseLogMessage(
          log.message.length === 1
            ? String(log.message[0])
            : JSON.stringify(log.message),
        );
        if (!entry) continue;
        if (!shouldWrite(entry)) continue;

        writeLogEntry(env, entry);
      }

      for (const exception of event.exceptions) {
        writeExceptionEntry(env, exception);
      }
    }
  },
};
