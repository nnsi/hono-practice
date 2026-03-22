import { useEffect, useMemo } from "react";

import { createUseNavigationSync } from "@packages/frontend-shared";
import { usePathname } from "expo-router";

import { performInitialSync } from "../sync/initialSync";
import { rnNetworkAdapter } from "../sync/rnPlatformAdapters";
import { syncEngine } from "../sync/syncEngine";
import { reportError } from "../utils/errorReporter";

export const useNavigationSync = createUseNavigationSync({
  react: { useMemo, useEffect },
  usePathname,
  syncAll: () => syncEngine.syncAll(),
  pullSync: (uid) => performInitialSync(uid),
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
