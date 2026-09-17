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
 * - `discardNavigationSync()`: 現在のインスタンスを cancel して破棄する。
 *
 * userId が変わる・未ログインになると旧インスタンスは cancel され破棄される。
 * mutex 待機中の pull が後から古い userId で走るのを防ぐため。破棄は
 * `useNavigationSync` だけでなく、ルートの認証ライフサイクル（各アプリの
 * useSyncEngine）からも呼ぶ。Mobile では `useNavigationSync` が tabs 配下に
 * しか mount されず、tabs 外の画面でログアウトすると観測できないため。
 */
export function createUseNavigationSync(deps: UseNavigationSyncDeps) {
  const {
    react: { useEffect },
    usePathname,
  } = deps;

  let cached: { userId: string; sync: NavigationSync } | null = null;

  const discardNavigationSync = () => {
    cached?.sync.cancel();
    cached = null;
  };

  const getNavigationSync = (userId: string): NavigationSync => {
    if (cached?.userId !== userId) {
      discardNavigationSync();
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
      if (!syncReady || !userId) {
        discardNavigationSync();
        return;
      }
      getNavigationSync(userId).trigger();
    }, [pathname, syncReady, userId]);
  }

  return { useNavigationSync, getNavigationSync, discardNavigationSync };
}
