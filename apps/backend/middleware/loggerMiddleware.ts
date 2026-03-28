import type { MiddlewareHandler } from "hono";

import type { AppContext } from "../context";
import { createLogger } from "../lib/logger";
import { createTracer } from "../lib/tracer";
import { appendLocalLog } from "./localLogWriter";
import { firstStackFrame, writeToWAE } from "./waeWriter";

/** ボットスキャナーがよく叩くパスか判定（.env, .git, wp-admin 等） */
const BOT_SCAN_RE =
  /\.\w{1,10}$|\/\.git|\/wp-|\/cgi-bin|\/admin|\/phpmy|\/actuator/i;
function isBotScanPath(path: string): boolean {
  return BOT_SCAN_RE.test(path);
}

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
        } else {
          appendLocalLog({
            type: "request",
            level: "error",
            requestId,
            method,
            path,
            error: errorMsg,
            status: 500,
            duration,
            ...summary,
          });
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

    // WAEにメトリクスを書き込み（404・ボットスキャンはノイズなので除外）
    // catchブロックで書き込み済みの場合は重複を防ぐためスキップ
    // app.request()経由のネストリクエストではWAE書き込みが失敗する可能性があるため、try-catchで保護
    const skipWae = status === 404 || (status === 401 && isBotScanPath(path));
    try {
      const wae = c.env.WAE_LOGS;
      if (wae && !skipWae && !waeWritten) {
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
      } else if (!waeWritten && !skipWae) {
        appendLocalLog({
          type: "request",
          level,
          requestId,
          method,
          path,
          status,
          duration,
          ...(errorMsg ? { error: errorMsg } : {}),
          ...summary,
        });
      }
    } catch {
      // WAE書き込み失敗はリクエスト処理に影響させない
    }
  };
};
