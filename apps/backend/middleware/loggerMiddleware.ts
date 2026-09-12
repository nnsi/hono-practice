import type { MiddlewareHandler } from "hono";

import type { AppContext } from "../context";
import {
  createAuthDiagnosticCollector,
  recordAuthDiagnostic,
} from "../lib/authDiagnostics";
import { createLogger } from "../lib/logger";
import { createTracer } from "../lib/tracer";
import {
  extractErrorMsg,
  isBotScanPath,
  writeErrorToWAE,
  writeResponseToWAE,
} from "./loggerHelpers";

/**
 * 構造化ロガーミドルウェア
 * - リクエストごとにrequestIdを生成し、全ログに付与
 * - リクエストごとにTracerを生成し、パフォーマンス計測を提供
 * - JSON形式で出力（Cloudflare Workers Logs対応）
 * - WAEへのメトリクス書き込み（waitUntilでレスポンス後に非同期実行）
 * - WAE未使用時はローカルJSONLファイルにフォールバック
 */
export const loggerMiddleware = (): MiddlewareHandler<AppContext> => {
  return async (c, next) => {
    const requestId = crypto.randomUUID();
    const method = c.req.method;
    const path = c.req.path;
    c.header("X-Request-ID", requestId);
    const diagnostics =
      method === "POST" && path === "/auth/token"
        ? createAuthDiagnosticCollector({
            environment: c.env.NODE_ENV,
            platform: c.req.header("X-Client-Platform"),
            flowId: c.req.header("X-Auth-Diagnostic-Id"),
            hasOrigin: Boolean(c.req.header("Origin")),
          })
        : undefined;
    if (diagnostics) c.set("authDiagnostics", diagnostics);

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
          ...(diagnostics ? { authDiagnostic: diagnostics.snapshot() } : {}),
        });
      } else {
        logger.error("Unhandled error", {
          error: errorMsg,
          duration,
          ...summary,
          ...(diagnostics ? { authDiagnostic: diagnostics.snapshot() } : {}),
        });
      }

      writeErrorToWAE(c, {
        requestId,
        method,
        path,
        errorMsg,
        duration,
        error,
      });
      waeWritten = true;

      throw error;
    }

    const duration = Date.now() - start;
    const status = c.res.status;
    if (status === 429)
      recordAuthDiagnostic(diagnostics?.observe, { reason: "rate_limited" });
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    const summary = tracer.getSummary();

    const errorMsg = status >= 400 ? await extractErrorMsg(c.res) : "";

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
      ...(diagnostics ? { authDiagnostic: diagnostics.snapshot() } : {}),
    });

    // WAEにメトリクスを書き込み（404・ボットスキャンはノイズなので除外）
    // catchブロックで書き込み済みの場合は重複を防ぐためスキップ
    const skipWae = status === 404 || (status === 401 && isBotScanPath(path));
    writeResponseToWAE(c, {
      requestId,
      method,
      path,
      level,
      status,
      duration,
      errorMsg,
      summary,
      skipWae,
      waeWritten,
    });
  };
};
