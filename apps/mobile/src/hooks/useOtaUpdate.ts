import { useEffect, useState } from "react";

import * as Updates from "expo-updates";
import { AppState } from "react-native";

import { reportError } from "../utils/errorReporter";

export function useOtaUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasPendingUpdate, setHasPendingUpdate] = useState(false);

  // Cold start: check → fetch → splash → reload
  useEffect(() => {
    const updatesState = {
      channel: Updates.channel,
      runtimeVersion: Updates.runtimeVersion,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      updateId: Updates.updateId,
      isEnabled: Updates.isEnabled,
    };
    console.log("[updates] state:", JSON.stringify(updatesState));
    reportError({
      errorType: "unhandled_error",
      message: `[updates] state: ${JSON.stringify(updatesState)}`,
    });

    if (__DEV__) return;

    Updates.checkForUpdateAsync()
      .then((result) => {
        console.log("[updates] checkForUpdate:", JSON.stringify(result));
        reportError({
          errorType: "unhandled_error",
          message: `[updates] checkForUpdate: ${JSON.stringify(result)}`,
        });
        if (result.isAvailable) {
          return Updates.fetchUpdateAsync().then(async (fetchResult) => {
            console.log("[updates] fetched:", JSON.stringify(fetchResult));
            reportError({
              errorType: "unhandled_error",
              message: `[updates] fetched: ${JSON.stringify(fetchResult)}`,
            });
            if (fetchResult.isNew) {
              setIsUpdating(true);
              await new Promise((r) => setTimeout(r, 1500));
              await Updates.reloadAsync();
            }
          });
        }
      })
      .catch((err) => {
        console.error("[updates] check failed:", err);
        reportError({
          errorType: "unhandled_error",
          message: `[updates] check failed: ${err instanceof Error ? err.message : String(err)}`,
          stack: err instanceof Error ? err.stack : undefined,
        });
      });
  }, []);

  // Foreground resume: check → fetch → show toast (no auto-reload)
  useEffect(() => {
    if (__DEV__) return;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || hasPendingUpdate) return;

      Updates.checkForUpdateAsync()
        .then((result) => {
          if (!result.isAvailable) return;
          return Updates.fetchUpdateAsync().then((fetchResult) => {
            if (fetchResult.isNew) {
              setHasPendingUpdate(true);
            }
          });
        })
        .catch((err) => {
          console.error("[updates] foreground check failed:", err);
        });
    });

    return () => subscription.remove();
  }, [hasPendingUpdate]);

  const triggerReload = async () => {
    setIsUpdating(true);
    await new Promise((r) => setTimeout(r, 1500));
    await Updates.reloadAsync();
  };

  const dismissPendingUpdate = () => setHasPendingUpdate(false);

  return { isUpdating, hasPendingUpdate, triggerReload, dismissPendingUpdate };
}
