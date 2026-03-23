import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { createUseSyncEngine } from "@packages/frontend-shared/hooks/useSyncEngine";

import { syncEngine } from "../sync/syncEngine";

const useSyncEngineShared = createUseSyncEngine({ useEffect, useRef });

export function useSyncEngine(isLoggedIn: boolean) {
  useSyncEngineShared(syncEngine, isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        syncEngine.syncAll();
      }
    });
    return () => sub.remove();
  }, [isLoggedIn]);
}
