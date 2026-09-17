import { useEffect, useRef } from "react";

import { createUseSyncEngine } from "@packages/frontend-shared/hooks/useSyncEngine";

import { getNavigationSync } from "../sync/navigationSync";
import { syncEngine } from "../sync/syncEngine";

const useSyncEngineShared = createUseSyncEngine({ useEffect, useRef });

export function useSyncEngine(isLoggedIn: boolean, userId: string | null) {
  useSyncEngineShared(syncEngine, isLoggedIn);

  // Why: タブ復帰・PWA のフォアグラウンド復帰で他端末の変更も取り込むため
  // pull → push の完全同期を走らせる。リロードは useNavigationSync の初回
  // pathname 評価で同期されるのでここでは扱わない。
  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      getNavigationSync(userId).trigger();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isLoggedIn, userId]);
}
