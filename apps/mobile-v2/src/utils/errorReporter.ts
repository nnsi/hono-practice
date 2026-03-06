import { Platform } from "react-native";

import { getApiUrl } from "./apiClient";

const API_URL = getApiUrl();
const MAX_STACK_LENGTH = 5000;

type ErrorReport = {
  errorType: "component_error" | "unhandled_error" | "network_error";
  message: string;
  stack?: string;
  userId?: string;
  screen?: string;
};

export function reportError(report: ErrorReport): void {
  // Fire-and-forget: エラー監視自体がクラッシュ源になってはならない
  try {
    const body = {
      ...report,
      message: report.message.slice(0, 1000),
      stack: report.stack?.slice(0, MAX_STACK_LENGTH),
      platform: Platform.OS as "ios" | "android" | "web",
    };

    fetch(`${API_URL}/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {
      // Silently ignore - error reporting must never throw
    });
  } catch {
    // Silently ignore
  }
}
