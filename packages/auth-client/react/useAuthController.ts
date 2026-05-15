import { useEffect, useSyncExternalStore } from "react";

import type { AuthController, AuthControllerState } from "../types";

export function useAuthController(
  controller: AuthController,
): AuthControllerState {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
}

export function useAuthBootstrap(controller: AuthController): void {
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await controller.hydrate();
      if (cancelled) return;
      await controller.reconcile();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [controller]);
}
