import type { NavigationSync, SyncMutex } from "@packages/sync-engine";
import { createNavigationSync } from "@packages/sync-engine";

import type { ReactHooks } from "./types";

type UseNavigationSyncDeps = {
  react: Pick<ReactHooks, "useEffect">;
  usePathname: () => string;
  syncAll: () => Promise<void>;
  pullSync: (userId: string) => Promise<void>;
  isOnline: () => boolean;
  mutex: SyncMutex;
  onError: (error: unknown, phase: "pull" | "push") => void;
};

/**
 * pull → push の完全同期を、画面遷移・フォアグラウンド復帰・オンライン復帰・
 * pull-to-refresh の各トリガーで共有するための factory。
 *
 * - `useNavigationSync`: pathname 変化ごとに `trigger()`（間引きあり）
 * - `getNavigationSync(userId)`: 同じ userId なら同一インスタンスを返す。
 *   復帰時の `trigger()` や明示更新の `run()` から使い、間引きと合流状態を共有する。
 *
 * userId が変わると旧インスタンスは破棄される。旧ユーザーの pull が進行中でも、
 * createInitialSync の sync generation 検査で書き込みは捨てられる。
 */
export function createUseNavigationSync(deps: UseNavigationSyncDeps) {
  const {
    react: { useEffect },
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

    useEffect(() => {
      if (!syncReady || !userId) return;
      getNavigationSync(userId).trigger();
    }, [pathname, syncReady, userId]);
  }

  return { useNavigationSync, getNavigationSync };
}
