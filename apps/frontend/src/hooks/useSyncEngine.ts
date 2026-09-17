import { useEffect, useRef } from "react";

import { createUseSyncEngine } from "@packages/frontend-shared/hooks/useSyncEngine";

import { syncEngine } from "../sync/syncEngine";
import { webNetworkAdapter } from "../sync/webPlatformAdapters";
import { discardNavigationSync, getNavigationSync } from "./useNavigationSync";

const useSyncEngineShared = createUseSyncEngine({ useEffect, useRef });

export function useSyncEngine(isLoggedIn: boolean, userId: string | null) {
  useSyncEngineShared(syncEngine, isLoggedIn);

  // Why: ログアウト・アカウント切替で待機中の pull を打ち切る（useNavigationSync と
  // 二重でも害はなく、Mobile と同じ責務配置にしておく）。
  useEffect(() => {
    if (!isLoggedIn || !userId) discardNavigationSync();
  }, [isLoggedIn, userId]);

  // Why: タブ復帰・PWA のフォアグラウンド復帰・オンライン復帰で他端末の変更も
  // 取り込むため pull → push の完全同期を走らせる。リロード時は
  // useNavigationSync の初回 pathname 評価が同じ trigger() を呼ぶ。
  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    const sync = getNavigationSync(userId);
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      sync.trigger();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const removeOnline = webNetworkAdapter.onOnline(() => sync.trigger());
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      removeOnline();
    };
  }, [isLoggedIn, userId]);
}
