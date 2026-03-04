import { Platform } from "react-native";

import { reportError } from "./errorReporter";

declare const ErrorUtils: {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler: (
    handler: (error: Error, isFatal?: boolean) => void,
  ) => void;
};

export function setupGlobalErrorHandler(): void {
  if (Platform.OS === "web") {
    window.addEventListener("error", (event) => {
      reportError({
        errorType: "unhandled_error",
        message: event.message || "Unknown error",
        stack: event.error?.stack,
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      reportError({
        errorType: "unhandled_error",
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });
  } else {
    // React Native: use ErrorUtils global handler
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      reportError({
        errorType: "unhandled_error",
        message: error.message || "Unknown error",
        stack: error.stack,
      });
      // Call original handler to preserve default behavior (red screen in dev, crash in prod)
      originalHandler(error, isFatal);
    });
  }
}
