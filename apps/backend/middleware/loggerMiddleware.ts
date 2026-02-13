import type { MiddlewareHandler } from "hono";

import type { AppContext } from "../context";
import { createLogger } from "../lib/logger";
import { createTracer } from "../lib/tracer";

/**
 * 構造化ロガーミドルウェア
 * - リクエストごとにrequestIdを生成し、全ログに付与
 * - リクエストごとにTracerを生成し、パフォーマンス計測を提供
 * - JSON形式で出力（Cloudflare Workers Logs対応）
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

      if (error instanceof Error) {
        logger.error("Unhandled error", {
          error: error.message,
          stack: error.stack,
          ...(error.cause ? { cause: String(error.cause) } : {}),
          duration,
          ...tracer.getSummary(),
        });
      } else {
        logger.error("Unhandled error", {
          error: String(error),
          duration,
          ...tracer.getSummary(),
        });
      }

      throw error;
    }

    const duration = Date.now() - start;
    const status = c.res.status;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    logger[level]("Response sent", {
      status,
      duration,
      ...tracer.getSummary(),
    });
  };
};
