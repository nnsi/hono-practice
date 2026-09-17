import { useEffect, useRef } from "react";

import { createUseSyncEngine } from "@packages/frontend-shared/hooks/useSyncEngine";
import { AppState, type AppStateStatus } from "react-native";

import { rnNetworkAdapter } from "../sync/rnPlatformAdapters";
import { syncEngine } from "../sync/syncEngine";
import { getNavigationSync } from "./useNavigationSync";

const useSyncEngineShared = createUseSyncEngine({ useEffect, useRef });

/**
 * フォアグラウンド復帰時の同期。他端末の変更も取り込むため pull → push の
 * 完全同期を走らせる。userId 未確定なら push のみ。
 */
export function handleAppStateChange(
  state: AppStateStatus,
  userId: string | null,
  deps: {
    getNavigationSync: typeof getNavigationSync;
    syncAll: () => Promise<void>;
  } = { getNavigationSync, syncAll: () => syncEngine.syncAll() },
): void {
  if (state !== "active") return;
  if (userId) {
    deps.getNavigationSync(userId).trigger();
  } else {
    void deps.syncAll();
  }
}

export function useSyncEngine(isLoggedIn: boolean, userId: string | null) {
  useSyncEngineShared(syncEngine, isLoggedIn);

  useEffect(() => {
    if (!isLoggedIn) return;
    const sub = AppState.addEventListener("change", (state) =>
      handleAppStateChange(state, userId),
    );
    return () => sub.remove();
  }, [isLoggedIn, userId]);

  // Why: startAutoSync の onOnline は push のみ。オンライン復帰でも他端末の
  // 変更を取り込むため完全同期を起こす。push が先に mutex を取っても
  // NavigationSync 側が解放を待つ。
  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    return rnNetworkAdapter.onOnline(() => getNavigationSync(userId).trigger());
  }, [isLoggedIn, userId]);
}
