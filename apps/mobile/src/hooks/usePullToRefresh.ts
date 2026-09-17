import { useCallback, useState } from "react";

import { useAuthContext } from "../contexts/AuthContext";
import { getNavigationSync } from "./useNavigationSync";

type Deps = { getNavigationSync: typeof getNavigationSync };
const defaultDeps: Deps = { getNavigationSync };

/**
 * RefreshControl 用。pull → push の完全同期を待ってからローダーを止める。
 * 認証・初期同期が未完了（syncReady=false / userId 未確定）の間は何もしない。
 * run() の { pulled } は現状 UI に出さない（mutex が 10 秒空かない稀なケースで、
 * 進行中の同期が完了すれば同じデータが入るため）。
 */
export function usePullToRefresh(deps: Deps = defaultDeps) {
  const { syncReady, userId } = useAuthContext();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!syncReady || !userId) return;
    setRefreshing(true);
    try {
      await deps.getNavigationSync(userId).run();
    } finally {
      setRefreshing(false);
    }
  }, [syncReady, userId, deps.getNavigationSync]);

  return { refreshing, onRefresh };
}
