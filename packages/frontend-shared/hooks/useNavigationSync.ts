import type { NavigationSync, SyncMutex } from "@packages/sync-engine";
import { createNavigationSync } from "@packages/sync-engine";

import type { ReactHooks } from "./types";

type UseNavigationSyncDeps = {
  react: Pick<ReactHooks, "useMemo" | "useEffect">;
  usePathname: () => string;
  syncAll: () => Promise<void>;
  pullSync: (userId: string) => Promise<void>;
  isOnline: () => boolean;
  mutex: SyncMutex;
  onError: (error: unknown, phase: "pull" | "push") => void;
};

/**
 * pull → push の完全同期を、画面遷移・フォアグラウンド復帰・pull-to-refresh の
 * 各トリガーで共有するための factory。
 *
 * - `useNavigationSync`: pathname 変化ごとに `trigger()`（間引きあり）
 * - `getNavigationSync(userId)`: 同じ userId なら同一インスタンスを返す。
 *   復帰時の `trigger()` や明示更新の `run()` から使い、間引き状態を共有する。
 */
export function createUseNavigationSync(deps: UseNavigationSyncDeps) {
  const {
    react: { useMemo, useEffect },
    usePathname,
  } = deps;

  let cached: { userId: string; sync: NavigationSync } | null = null;

  const getNavigationSync = (userId: string): NavigationSync => {
    if (cached?.userId !== userId) {
      cached = {
        userId,
        sync: createNavigationSync({
          syncAll: deps.syncAll,
          pullSync: () => deps.pullSync(userId),
          isOnline: deps.isOnline,
          mutex: deps.mutex,
          onError: deps.onError,
        }),
      };
    }
    return cached.sync;
  };

  function useNavigationSync(syncReady: boolean, userId: string | null): void {
    const pathname = usePathname();

    const sync = useMemo(() => {
      if (!syncReady || !userId) return null;
      return getNavigationSync(userId);
    }, [syncReady, userId]);

    useEffect(() => {
      sync?.trigger();
    }, [pathname, sync]);
  }

  return { useNavigationSync, getNavigationSync };
}
