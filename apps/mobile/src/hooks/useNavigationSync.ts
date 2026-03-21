import { useEffect, useMemo } from "react";

import { createNavigationSync } from "@packages/sync-engine";
import { usePathname } from "expo-router";

import { performInitialSync } from "../sync/initialSync";
import { rnNetworkAdapter } from "../sync/rnPlatformAdapters";
import { syncEngine } from "../sync/syncEngine";
import { reportError } from "../utils/errorReporter";

export function useNavigationSync(
  syncReady: boolean,
  userId: string | null,
): void {
  const pathname = usePathname();

  const triggerSync = useMemo(() => {
    if (!syncReady || !userId) return null;
    const uid = userId;
    return createNavigationSync({
      syncAll: () => syncEngine.syncAll(),
      pullSync: () => performInitialSync(uid),
      isOnline: () => rnNetworkAdapter.isOnline(),
      mutex: syncEngine.mutex,
      onError: (error) => {
        reportError({
          errorType: "unhandled_error",
          message: `Navigation sync failed: ${error instanceof Error ? error.message : String(error)}`,
          stack: error instanceof Error ? error.stack : undefined,
        });
      },
    });
  }, [syncReady, userId]);

  useEffect(() => {
    triggerSync?.();
  }, [pathname, triggerSync]);
}
