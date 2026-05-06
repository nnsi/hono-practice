import type { Logger } from "@backend/lib/logger";

/**
 * Promise を非ブロッキングで実行する。
 *
 * - Cloudflare Workers 環境: `c.executionCtx.waitUntil` でバックグラウンド実行する
 * - Node / テスト環境: `executionCtx` プロパティアクセス自体が throw するので無視
 *
 * 失敗時は logger に warn を出力する（観測性のため）。logger が無い場合のみ
 * unhandled rejection を防ぐ目的で `.catch(() => {})` のフォールバック。
 */
export function fireAndForget(
  c: { executionCtx?: { waitUntil?: (promise: Promise<unknown>) => void } },
  promise: Promise<unknown>,
  logger?: Logger,
): void {
  const observed = logger
    ? promise.catch((e: unknown) => {
        logger.warn("fireAndForget rejected", {
          error: e instanceof Error ? e.message : String(e),
        });
      })
    : promise.catch(() => {});
  try {
    const ctx = c.executionCtx;
    if (ctx?.waitUntil) {
      ctx.waitUntil(observed);
    }
  } catch {
    // テスト環境では executionCtx へのアクセス自体が throw する — 無視
  }
}
