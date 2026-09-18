/**
 * authMiddleware の「ユーザーが存在し削除されていない」確認結果を isolate 内メモリに
 * 短時間だけ保持する。Hyperdrive 経由の DB 往復 (~150ms) を全 endpoint から 1 回減らす。
 *
 * - 正の結果 (存在する) だけを保持する。削除済み・未存在は保持しない。
 * - user オブジェクト自体は保持しない。/user/me などが古いプロフィールを返さないため。
 * - 同一 userId の同時リクエストは 1 回の検索を共有する (アプリ起動時の並列 GET 対策)。
 * - 削除 usecase から invalidate する。別 isolate では TTL 経過まで残る。
 */
export type AuthUserCache = {
  /**
   * cache に有効な entry があれば `{ cached: true }` を返す。無ければ lookup を実行し、
   * 結果が truthy なら記録して `{ cached: false, user }` を返す。
   */
  resolve: <T>(
    userId: string,
    lookup: () => Promise<T | undefined>,
  ) => Promise<{ cached: true } | { cached: false; user: T | undefined }>;
  invalidate: (userId: string) => void;
  clear: () => void;
  size: () => number;
};

type Entry =
  | { state: "pending"; promise: Promise<unknown> }
  | { state: "verified"; expiresAt: number };

export const DEFAULT_AUTH_USER_CACHE_TTL_MS = 60_000;
const DEFAULT_MAX_ENTRIES = 1_000;

export function createAuthUserCache(options?: {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}): AuthUserCache {
  const ttlMs = options?.ttlMs ?? DEFAULT_AUTH_USER_CACHE_TTL_MS;
  const maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const now = options?.now ?? (() => Date.now());
  const entries = new Map<string, Entry>();

  const evictIfFull = () => {
    if (entries.size < maxEntries) return;
    // Map は挿入順を保つので先頭 (最も古い) を落とす
    const oldest = entries.keys().next();
    if (!oldest.done) entries.delete(oldest.value);
  };

  return {
    resolve: async (userId, lookup) => {
      const entry = entries.get(userId);
      if (entry?.state === "verified") {
        if (entry.expiresAt > now()) {
          return { cached: true };
        }
        entries.delete(userId);
      }
      if (entry?.state === "pending") {
        const user = (await entry.promise) as Awaited<
          ReturnType<typeof lookup>
        >;
        return { cached: false, user };
      }

      const promise = lookup();
      evictIfFull();
      entries.set(userId, { state: "pending", promise });
      let user: Awaited<ReturnType<typeof lookup>>;
      try {
        user = await promise;
      } catch (e) {
        entries.delete(userId);
        throw e;
      }
      // 待機中に invalidate されていたら記録しない
      const current = entries.get(userId);
      if (current?.state !== "pending" || current.promise !== promise) {
        return { cached: false, user };
      }
      if (user) {
        entries.set(userId, { state: "verified", expiresAt: now() + ttlMs });
      } else {
        entries.delete(userId);
      }
      return { cached: false, user };
    },
    invalidate: (userId) => {
      entries.delete(userId);
    },
    clear: () => {
      entries.clear();
    },
    size: () => entries.size,
  };
}

/** isolate 単位で共有する既定の cache */
export const authUserCache = createAuthUserCache();
