import { createAuthDiagnosticReporter } from "@packages/auth-client/authDiagnosticReporter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import * as Updates from "expo-updates";
import { AppState, Platform } from "react-native";

import { getApiUrl } from "../api/apiClient";
import { mobileOnlineRetryAdapter } from "./mobileOnlineRetryAdapter";

export const mobileAuthDiagnostics = createAuthDiagnosticReporter({
  apiUrl: getApiUrl(),
  platform: Platform.OS as "ios" | "android" | "web",
  appVersion: Constants.expoConfig?.version,
  runtimeVersion: Updates.runtimeVersion ?? undefined,
  updateId: Updates.updateId ?? undefined,
  createId: randomUUID,
  storage: {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    getAllKeys: () => AsyncStorage.getAllKeys(),
    removeItem: (key) => AsyncStorage.removeItem(key),
  },
});

export const mobileAuthDiagnosticHeaders = {
  "X-Auth-Diagnostic-Id": mobileAuthDiagnostics.flowId,
  "X-Client-Platform": Platform.OS,
};

export function startMobileAuthDiagnosticFlush(): () => void {
  let active = true;
  const flush = () => {
    if (!active) return;
    void mobileAuthDiagnostics.flush().catch(() => {});
  };
  flush();
  const unsubscribeOnline = mobileOnlineRetryAdapter.registerOnlineRetry(flush);
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") flush();
  });
  return () => {
    active = false;
    unsubscribeOnline();
    subscription.remove();
  };
}
