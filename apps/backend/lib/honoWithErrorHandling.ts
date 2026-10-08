import { Hono } from "hono";

import { DomainValidateError } from "@packages/domain/errors";

import type { AppContext } from "../context";
import { AIQuotaError, AppError, AuthError, UnauthorizedError } from "../error";
import { isPostgresUniqueViolation } from "../infra/rdb/postgresError";

export function newHonoWithErrorHandling(): Hono<AppContext> {
  const app = new Hono<AppContext>();

  app.onError((err, c) => {
    // アクセストークンの認証エラーはログ不要
    if (err instanceof UnauthorizedError) {
      return c.json({ message: err.message }, 401);
    }

    // 構造化ログでエラーを記録（loggerMiddleware適用後のみ）
    try {
      const logger = c.get("logger");
      logger.error("Request error", {
        error: err.message,
        type: err.constructor.name,
      });
    } catch {
      // loggerMiddleware適用前のエラーはフォールバック
    }

    if (err instanceof AIQuotaError) {
      return c.json(err.body, err.status);
    }

    if (err instanceof AppError) {
      return c.json({ message: err.message }, err.status);
    }

    if (err instanceof AuthError) {
      return c.json({ message: err.message }, 401);
    }

    if (err instanceof DomainValidateError) {
      return c.json({ message: err.message }, 400);
    }

    if (err instanceof SyntaxError) {
      return c.json({ message: "Invalid JSON" }, 400);
    }

    // 事前チェックをすり抜けた一意制約違反 (競合・クライアント指定 ID の重複) は 409 に分類する。
    // 制約名は内部構造なので応答に含めない。
    if (isPostgresUniqueViolation(err)) {
      return c.json({ message: "conflict" }, 409);
    }

    return c.json(
      {
        message: "internal server error",
        stack:
          c.env.NODE_ENV === "development" || c.env.NODE_ENV === "test"
            ? err.stack
            : undefined,
      },
      500,
    );
  });

  return app;
}
