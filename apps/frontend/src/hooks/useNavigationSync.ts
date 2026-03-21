import { useEffect, useMemo } from "react";

import { createNavigationSync } from "@packages/sync-engine";
import { useRouterState } from "@tanstack/react-router";

import { performInitialSync } from "../sync/initialSync";
import { syncEngine } from "../sync/syncEngine";

export function useNavigationSync(
  syncReady: boolean,
  userId: string | null,
): void {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const triggerSync = useMemo(() => {
    if (!syncReady || !userId) return null;
    const uid = userId;
    return createNavigationSync({
      syncAll: () => syncEngine.syncAll(),
      pullSync: () => performInitialSync(uid),
      isOnline: () => navigator.onLine,
      mutex: syncEngine.mutex,
      onError: (error) => {
        console.warn(
          "[nav-sync] error:",
          error instanceof Error ? error.message : error,
        );
      },
    });
  }, [syncReady, userId]);

  useEffect(() => {
    triggerSync?.();
  }, [pathname, triggerSync]);
}
