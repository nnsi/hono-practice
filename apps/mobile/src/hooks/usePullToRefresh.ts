import { useCallback, useState } from "react";

import { useAuthContext } from "../contexts/AuthContext";
import { getNavigationSync } from "../sync/navigationSync";
import { syncEngine } from "../sync/syncEngine";

/**
 * RefreshControl 用。pull → push の完全同期を待ってからローダーを止める。
 */
export function usePullToRefresh() {
  const { userId } = useAuthContext();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (userId) {
        await getNavigationSync(userId).run();
      } else {
        await syncEngine.syncAll();
      }
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  return { refreshing, onRefresh };
}
