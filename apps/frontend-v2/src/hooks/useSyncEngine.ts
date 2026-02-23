import { useEffect } from "react";
import { syncEngine } from "../sync/syncEngine";

export function useSyncEngine(isLoggedIn: boolean) {
  useEffect(() => {
    if (!isLoggedIn) return;
    const cleanup = syncEngine.startAutoSync();
    return cleanup;
  }, [isLoggedIn]);
}
