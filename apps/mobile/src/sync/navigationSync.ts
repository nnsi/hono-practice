import { useEffect, useMemo } from "react";

import { createUseNavigationSync } from "@packages/frontend-shared";
import { usePathname } from "expo-router";

import { reportError } from "../utils/errorReporter";
import { performInitialSync } from "./initialSync";
import { rnNetworkAdapter } from "./rnPlatformAdapters";
import { syncEngine } from "./syncEngine";

export const { useNavigationSync, getNavigationSync } = createUseNavigationSync(
  {
    react: { useMemo, useEffect },
    usePathname,
    syncAll: () => syncEngine.syncAll(),
    pullSync: (uid) => performInitialSync(uid),
    isOnline: () => rnNetworkAdapter.isOnline(),
    mutex: syncEngine.mutex,
    onError: (error, phase) => {
      reportError({
        errorType: "unhandled_error",
        message: `Navigation sync ${phase} failed: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
      });
    },
  },
);
