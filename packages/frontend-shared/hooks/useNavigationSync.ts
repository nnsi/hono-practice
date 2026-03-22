import type { SyncMutex } from "@packages/sync-engine";
import { createNavigationSync } from "@packages/sync-engine";

import type { ReactHooks } from "./types";

type UseNavigationSyncDeps = {
  react: Pick<ReactHooks, "useMemo" | "useEffect">;
  usePathname: () => string;
  syncAll: () => Promise<void>;
  pullSync: (userId: string) => Promise<void>;
  isOnline: () => boolean;
  mutex: SyncMutex;
  onError: (error: unknown) => void;
};

export function createUseNavigationSync(deps: UseNavigationSyncDeps) {
  const {
    react: { useMemo, useEffect },
    usePathname,
  } = deps;

  return function useNavigationSync(
    syncReady: boolean,
    userId: string | null,
  ): void {
    const pathname = usePathname();

    const triggerSync = useMemo(() => {
      if (!syncReady || !userId) return null;
      const uid = userId;
      return createNavigationSync({
        syncAll: deps.syncAll,
        pullSync: () => deps.pullSync(uid),
        isOnline: deps.isOnline,
        mutex: deps.mutex,
        onError: deps.onError,
      });
    }, [syncReady, userId]);

    useEffect(() => {
      triggerSync?.();
    }, [pathname, triggerSync]);
  };
}
