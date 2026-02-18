import type { MiddlewareHandler } from "hono";

import type { AnalyticsEngineDataset } from "@cloudflare/workers-types";

import type { AppContext } from "../context";
import { createLogger } from "../lib/logger";
import type { TracerSummary } from "../lib/tracer";
import { createTracer } from "../lib/tracer";

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
                status: 500,
                duration,
                summary,
              }),
            ),
          );
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

    // 内部リクエスト（batch等）の場合、トレーサーサマリーをレスポンスヘッダーに付与
    if ((c.env as Record<string, unknown>).__authenticatedUserId) {
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
      ...summary,
    });

    // WAEにメトリクスを書き込み（404はボットトラフィックが大半なので除外）
    // app.request()経由のネストリクエストではWAE書き込みが失敗する可能性があるため、try-catchで保護
    try {
      const wae = c.env.WAE_LOGS;
      if (wae && status !== 404) {
        c.executionCtx.waitUntil(
          Promise.resolve(
            writeToWAE(wae, {
              level,
              requestId,
              method,
              path,
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
