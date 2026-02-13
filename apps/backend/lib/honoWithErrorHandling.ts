import { Hono } from "hono";

import type { AppContext } from "../context";
import {
  AppError,
  AuthError,
  DomainValidateError,
  UnauthorizedError,
} from "../error";

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

    if (err instanceof AppError) {
      return c.json({ message: err.message }, err.status);
    }

    if (err instanceof AuthError) {
      return c.json({ message: err.message }, 401);
    }

    if (err instanceof DomainValidateError) {
      return c.json({ message: err.message }, err.status);
    }

    return c.json(
      {
        message: "internal server error",
        stack: c.env.NODE_ENV !== "production" ? err.stack : undefined,
      },
      500,
    );
  });

  return app;
}
