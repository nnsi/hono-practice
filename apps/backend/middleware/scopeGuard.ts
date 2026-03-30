import type { Next } from "hono";

import type { ApiKeyScope } from "@packages/domain/apiKey/apiKeySchema";

import type { HonoContext } from "../context";
import { AppError } from "../error";

/**
 * APIキーのスコープを検証するミドルウェアファクトリ。
 * 指定されたスコープのいずれかを持つAPIキーのみアクセスを許可する。
 */
export function requireScope(...requiredScopes: ApiKeyScope[]) {
  return async (c: HonoContext, next: Next) => {
    const scopes = c.get("apiKeyScopes");

    // apiKeyScopes が未設定の場合（セッション認証経由など）はスキップ
    if (!scopes) {
      return next();
    }

    // "all" は全エンドポイントへのアクセスを許可
    if (scopes.includes("all")) {
      return next();
    }

    const hasScope = requiredScopes.some((s) => scopes.includes(s));
    if (!hasScope) {
      throw new AppError(
        `API key does not have required scope for this endpoint`,
        403,
      );
    }

    return next();
  };
}

/**
 * リソースベースのスコープ検証。
 * GET/HEAD → `${resource}:read`、それ以外 → `${resource}:write` に自動マッピング。
 */
export function requireResourceScope(resource: string) {
  return async (c: HonoContext, next: Next) => {
    const scopes = c.get("apiKeyScopes");

    if (!scopes) {
      return next();
    }

    if (scopes.includes("all")) {
      return next();
    }

    const method = c.req.method.toUpperCase();
    const suffix = method === "GET" || method === "HEAD" ? "read" : "write";
    const required = `${resource}:${suffix}` as ApiKeyScope;

    if (!scopes.includes(required)) {
      throw new AppError(
        `API key does not have required scope for this endpoint`,
        403,
      );
    }

    return next();
  };
}
