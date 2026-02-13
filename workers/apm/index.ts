/**
 * Actiko APM Tail Worker
 *
 * プロデューサーWorker (actiko-backend) から送られる構造化ログを
 * パースして Analytics Engine にデータポイントとして書き込む。
 *
 * ログフォーマット (ApmLog):
 *   { _t: "apm", m: method, p: path, s: status, d: duration_ms, co: colo }
 */

type Env = {
  APM: AnalyticsEngineDataset;
};

type TailLog = {
  level: string;
  message: unknown[];
  timestamp: number;
};

type TailException = {
  name: string;
  message: string;
  timestamp: number;
};

type FetchEventInfo = {
  type: "fetch";
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  response?: {
    status: number;
  };
};

type TailItem = {
  scriptName: string | null;
  event: FetchEventInfo | null;
  eventTimestamp: number | null;
  logs: TailLog[];
  exceptions: TailException[];
  outcome: string;
};

type ApmLog = {
  _t: "apm";
  m: string;
  p: string;
  s: number;
  d: number;
  co: string;
};

function isApmLog(data: unknown): data is ApmLog {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj._t === "apm" &&
    typeof obj.m === "string" &&
    typeof obj.p === "string" &&
    typeof obj.s === "number" &&
    typeof obj.d === "number"
  );
}

export default {
  async tail(events: TailItem[], env: Env): Promise<void> {
    for (const event of events) {
      for (const log of event.logs) {
        if (log.message.length === 0) continue;

        const raw = log.message[0];
        if (typeof raw !== "string") continue;

        let data: unknown;
        try {
          data = JSON.parse(raw);
        } catch {
          continue;
        }

        if (!isApmLog(data)) continue;

        env.APM.writeDataPoint({
          blobs: [
            data.m, // blob1: HTTP メソッド
            data.p, // blob2: エンドポイントパス
            String(data.s), // blob3: ステータスコード
            data.co ?? "unknown", // blob4: Cloudflare データセンター
            event.outcome, // blob5: Worker 実行結果
          ],
          doubles: [
            data.d, // double1: レイテンシ (ms)
            data.s >= 500 ? 1 : 0, // double2: サーバーエラーフラグ
            data.s >= 400 ? 1 : 0, // double3: クライアントエラーフラグ
          ],
          indexes: [data.p], // パス別にサンプリング
        });
      }

      // 未処理例外も記録
      for (const exception of event.exceptions) {
        const path =
          event.event?.type === "fetch"
            ? new URL(event.event.request.url).pathname
            : "unknown";

        env.APM.writeDataPoint({
          blobs: [
            event.event?.request?.method ?? "UNKNOWN", // blob1
            path, // blob2
            "exception", // blob3
            "unknown", // blob4
            event.outcome, // blob5
            exception.name, // blob6: 例外名
            exception.message.slice(0, 200), // blob7: 例外メッセージ（切り詰め）
          ],
          doubles: [
            0, // double1: レイテンシ不明
            1, // double2: エラーフラグ
            0, // double3
          ],
          indexes: [path],
        });
      }
    }
  },
};
