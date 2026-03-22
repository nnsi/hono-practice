import { useEffect, useMemo } from "react";

import { createUseNavigationSync } from "@packages/frontend-shared";
import { useRouterState } from "@tanstack/react-router";

import { performInitialSync } from "../sync/initialSync";
import { syncEngine } from "../sync/syncEngine";

export const useNavigationSync = createUseNavigationSync({
  react: { useMemo, useEffect },
  usePathname: () => useRouterState({ select: (s) => s.location.pathname }),
  syncAll: () => syncEngine.syncAll(),
  pullSync: (uid) => performInitialSync(uid),
  isOnline: () => navigator.onLine,
  mutex: syncEngine.mutex,
  onError: (error) => {
    console.warn(
      "[nav-sync] error:",
      error instanceof Error ? error.message : error,
    );
  },
});
