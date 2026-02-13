import type { Next } from "hono";

import type { HonoContext } from "../context";

/**
 * APM用構造化ログの型定義
 * Tail Workerがパースして Analytics Engine に書き込む
 *
 * 注意: console.log は1行300文字制限があるため、フィールドは最小限に抑える
 */
export type ApmLog = {
  _t: "apm";
  /** HTTP メソッド */
  m: string;
  /** パス */
  p: string;
  /** ステータスコード */
  s: number;
  /** リクエスト所要時間(ms) */
  d: number;
  /** Cloudflare データセンター（coloコード） */
  co: string;
};

export async function apmMiddleware(c: HonoContext, next: Next) {
  const startTime = Date.now();

  await next();

  const duration = Date.now() - startTime;
  const url = new URL(c.req.url);

  // cfオブジェクトからColoを取得（Cloudflare Workers環境のみ）
  const cf = (c.req.raw as unknown as { cf?: { colo?: string } }).cf;
  const colo = cf?.colo ?? "local";

  const log: ApmLog = {
    _t: "apm",
    m: c.req.method,
    p: url.pathname,
    s: c.res.status,
    d: duration,
    co: colo,
  };

  console.log(JSON.stringify(log));
}
