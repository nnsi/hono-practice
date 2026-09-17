import { useEffect, useRef } from "react";

import { createUseSyncEngine } from "@packages/frontend-shared/hooks/useSyncEngine";
import { AppState } from "react-native";

import { getNavigationSync } from "../sync/navigationSync";
import { syncEngine } from "../sync/syncEngine";

const useSyncEngineShared = createUseSyncEngine({ useEffect, useRef });

export function useSyncEngine(isLoggedIn: boolean, userId: string | null) {
  useSyncEngineShared(syncEngine, isLoggedIn);

  // Why: フォアグラウンド復帰で他端末の変更も取り込むため pull → push の
  // 完全同期を走らせる。userId 未確定なら push のみ。
  useEffect(() => {
    if (!isLoggedIn) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (userId) {
        getNavigationSync(userId).trigger();
      } else {
        syncEngine.syncAll();
      }
    });
    return () => sub.remove();
  }, [isLoggedIn, userId]);
}
