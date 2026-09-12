import { createAuthDiagnosticReporter } from "@packages/auth-client";

import { getApiUrl } from "../api/apiClient";

export const webAuthDiagnostics = createAuthDiagnosticReporter({
  apiUrl: getApiUrl(),
  platform: "web",
  appVersion: "auth-diagnostics-20260912.1",
  storage: {
    getItem: async (key) => localStorage.getItem(key),
    setItem: async (key, value) => localStorage.setItem(key, value),
    getAllKeys: async () => Object.keys(localStorage),
    removeItem: async (key) => localStorage.removeItem(key),
  },
});

export function registerWebAuthDiagnosticFlush(): () => void {
  const flush = () => {
    void webAuthDiagnostics.flush();
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") flush();
  };
  flush();
  window.addEventListener("online", flush);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("online", flush);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
