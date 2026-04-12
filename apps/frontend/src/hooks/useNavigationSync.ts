import { useEffect, useMemo } from "react";

import { createUseNavigationSync } from "@packages/frontend-shared";
import { useRouterState } from "@tanstack/react-router";

import { performInitialSync } from "../sync/initialSync";
import { syncEngine } from "../sync/syncEngine";
import { reportError } from "../utils/errorReporter";

export const useNavigationSync = createUseNavigationSync({
  react: { useMemo, useEffect },
  usePathname: () => useRouterState({ select: (s) => s.location.pathname }),
  syncAll: () => syncEngine.syncAll(),
  pullSync: (uid) => performInitialSync(uid),
  isOnline: () => navigator.onLine,
  mutex: syncEngine.mutex,
  onError: (error, phase) => {
    reportError({
      errorType: "unhandled_error",
      message: `Navigation sync ${phase} failed: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
    });
  },
});
