import { useEffect, useRef } from "react";
import { syncEngine } from "../sync/syncEngine";

export function useSyncEngine(isLoggedIn: boolean) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      cleanupRef.current = syncEngine.startAutoSync();
    }
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [isLoggedIn]);
}
