/**
 * ローカル開発環境用ログライター
 * WAEが使えないローカル環境で、リクエストログ・クライアントエラーをJSONLファイルに書き出す
 * ファイル: tmp/yyyymmdd.log（プロジェクトルート直下）
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/** JST (Asia/Tokyo) で今日の日付を yyyymmdd 形式で返す */
const getTodayJST = (): string => {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
};

/**
 * ログエントリをJSONLファイルに追記する
 * ロギング失敗は絶対にサーバーをクラッシュさせない
 */
export function appendLocalLog(entry: Record<string, unknown>): void {
  try {
    const root = process.cwd();
    const dir = join(root, "tmp");
    mkdirSync(dir, { recursive: true });

    const filePath = join(dir, `${getTodayJST()}.log`);
    const line = `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`;
    appendFileSync(filePath, line);
  } catch {
    // ロギング失敗はサーバーに影響させない
  }
}
