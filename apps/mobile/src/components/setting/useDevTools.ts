import { useCallback, useEffect, useState } from "react";

import { refreshPlanFromBackend } from "../../hooks/useRevenueCat";
import {
  isForcedOffline,
  setForcedOffline,
} from "../../sync/rnPlatformAdapters";
import { syncEngine } from "../../sync/syncEngine";

export function useDevTools() {
  const [offline, setOffline] = useState<boolean>(isForcedOffline());
  const [refreshing, setRefreshing] = useState(false);

  // 別経路（Maestro script など）から forcedOffline が変わった場合に
  // mount 時点での値を読み直す。listener は持たせない（dev tools 限定）。
  useEffect(() => {
    setOffline(isForcedOffline());
  }, []);

  const handleToggleOffline = useCallback((value: boolean) => {
    setForcedOffline(value);
    setOffline(value);
    // off へ戻したときに sync を即時走らせる (NetInfo 経由の online 遷移を待たない)。
    // ベストエフォート: 失敗は通常の sync リトライに委ねる。
    if (!value) {
      syncEngine.syncAll().catch(() => {});
    }
  }, []);

  const handleRefreshPlan = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    // dev tools なので失敗は握りつぶす（ユーザー向けエラー表示は不要）。
    await refreshPlanFromBackend()
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, [refreshing]);

  return {
    offline,
    refreshing,
    handleToggleOffline,
    handleRefreshPlan,
  };
}
