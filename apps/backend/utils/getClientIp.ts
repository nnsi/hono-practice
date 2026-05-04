import type { Context } from "hono";

/**
 * クライアントIPアドレスを取得する。
 *
 * Cloudflare Workers 環境では `cf-connecting-ip` を最優先する。
 * これは Cloudflare エッジが書き込むヘッダで、外部クライアントからは偽装不可能。
 * **wrangler dev / 非 Cloudflare 環境では信頼できない**ため、`applyRateLimit`
 * の fail-close で本番外の使用を制限している前提で利用すること。
 */
export function getClientIp(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-real-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous"
  );
}
