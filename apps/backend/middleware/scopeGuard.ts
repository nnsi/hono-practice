import type { Next } from "hono";

import type { ApiKeyScope } from "@packages/domain/apiKey/apiKeySchema";

import type { HonoContext } from "../context";
import { AppError } from "../error";

/**
 * APIキーのスコープを検証するミドルウェアファクトリ。
 * 指定されたスコープのいずれかを持つAPIキーのみアクセスを許可する。
 */
export function requireScope(...allowedScopes: ApiKeyScope[]) {
  return async (c: HonoContext, next: Next) => {
    const scope = c.get("apiKeyScope");

    // apiKeyScope が未設定の場合（セッション認証経由など）はスキップ
    if (!scope) {
      return next();
    }

    if (!allowedScopes.includes(scope)) {
      throw new AppError(
        `API key scope "${scope}" does not have access to this endpoint`,
        403,
      );
    }

    return next();
  };
}
