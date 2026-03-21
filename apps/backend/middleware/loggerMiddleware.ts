import type { MiddlewareHandler } from "hono";

import type { AnalyticsEngineDataset } from "@cloudflare/workers-types";

import type { AppContext } from "../context";
import { createLogger } from "../lib/logger";
import type { TracerSummary } from "../lib/tracer";
import { createTracer } from "../lib/tracer";

/** スタックトレースの最初のフレーム（"at ..."行）を取得 */
const firstStackFrame = (stack?: string): string => {
  if (!stack) return "";
  const line = stack.split("\n").find((l) => l.trimStart().startsWith("at "));
  return line?.trim() ?? "";
};

/** WAEに書き込むデータポイントを生成 */
const writeToWAE = (
  wae: AnalyticsEngineDataset,
  entry: {
    level: string;
    requestId: string;
    method: string;
    path: string;
    feature?: string;
    error?: string;
    stackFrame?: string;
    status: number;
    duration: number;
    summary: TracerSummary;
  },
) => {
  wae.writeDataPoint({
    blobs: [
      entry.level,
      "Response sent",
      entry.requestId,
      entry.method,
      entry.path,
      entry.feature ?? "",
      entry.error ?? "",
      entry.stackFrame ?? "",
    ],
    doubles: [
      entry.status,
      entry.duration,
      entry.summary.dbMs,
      entry.summary.r2Ms,
      entry.summary.kvMs,
      entry.summary.extMs,
      entry.summary.spanCount,
    ],
    indexes: [entry.level],
  });
};

/**
 * 構造化ロガーミドルウェア
 * - リクエストごとにrequestIdを生成し、全ログに付与
 * - リクエストごとにTracerを生成し、パフォーマンス計測を提供
 * - JSON形式で出力（Cloudflare Workers Logs対応）
 * - WAEへのメトリクス書き込み（waitUntilでレスポンス後に非同期実行）
 * - 全環境で有効（localだけでなくstg/productionでも動作）
 */
export const loggerMiddleware = (): MiddlewareHandler<AppContext> => {
  return async (c, next) => {
    const requestId = crypto.randomUUID().slice(0, 8);
    const method = c.req.method;
    const path = c.req.path;

    const logger = createLogger({
      bindings: { requestId, method, path },
    });
    const tracer = createTracer();

    c.set("logger", logger);
    c.set("tracer", tracer);

    logger.info("Request received");

    const start = Date.now();
    let waeWritten = false;

    try {
      await next();
    } catch (error) {
      const duration = Date.now() - start;
      const summary = tracer.getSummary();
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (error instanceof Error) {
        logger.error("Unhandled error", {
          error: error.message,
          stack: error.stack,
          ...(error.cause ? { cause: String(error.cause) } : {}),
          duration,
          ...summary,
        });
      } else {
        logger.error("Unhandled error", {
          error: errorMsg,
          duration,
          ...summary,
        });
      }

      // WAEにエラーログを書き込み（app.request()経由のネストリクエストでも安全に動作させる）
      try {
        const wae = c.env.WAE_LOGS;
        if (wae) {
          c.executionCtx.waitUntil(
            Promise.resolve(
              writeToWAE(wae, {
                level: "error",
                requestId,
                method,
                path,
                error: errorMsg,
                stackFrame:
                  error instanceof Error ? firstStackFrame(error.stack) : "",
                status: 500,
                duration,
                summary,
              }),
            ),
          );
          waeWritten = true;
        }
      } catch {
        // WAE書き込み失敗はリクエスト処理に影響させない
      }

      throw error;
    }

    const duration = Date.now() - start;
    const status = c.res.status;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    const summary = tracer.getSummary();

    // エラーレスポンス時はレスポンスbodyからエラー詳細を抽出（zValidatorのバリデーションエラー、500エラー等）
    let errorMsg = "";
    if (status >= 400) {
      try {
        const cloned = c.res.clone();
        const body = await cloned.json();
        const msg = body?.error ?? body?.message;
        if (msg) {
          errorMsg = JSON.stringify(msg).slice(0, 500);
        }
      } catch {
        // JSON解析失敗は無視
      }
    }

    // 内部リクエスト（batch等）の場合、トレーサーサマリーをレスポンスヘッダーに付与
    if (c.env.__authenticatedUserId) {
      const newRes = new Response(c.res.body, {
        status: c.res.status,
        statusText: c.res.statusText,
        headers: new Headers(c.res.headers),
      });
      newRes.headers.set("X-Tracer-Summary", JSON.stringify(summary));
      c.res = newRes;
    }

    logger[level]("Response sent", {
      status,
      duration,
      ...(errorMsg ? { validationError: errorMsg } : {}),
      ...summary,
    });

    // WAEにメトリクスを書き込み（404はボットトラフィックが大半なので除外）
    // catchブロックで書き込み済みの場合は重複を防ぐためスキップ
    // app.request()経由のネストリクエストではWAE書き込みが失敗する可能性があるため、try-catchで保護
    try {
      const wae = c.env.WAE_LOGS;
      if (wae && status !== 404 && !waeWritten) {
        c.executionCtx.waitUntil(
          Promise.resolve(
            writeToWAE(wae, {
              level,
              requestId,
              method,
              path,
              error: errorMsg,
              status,
              duration,
              summary,
            }),
          ),
        );
      }
    } catch {
      // WAE書き込み失敗はリクエスト処理に影響させない
    }
  };
};
