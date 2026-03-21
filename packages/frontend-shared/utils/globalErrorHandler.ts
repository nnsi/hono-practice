import type { ErrorReport } from "./errorReporter";

type ErrorReportInput = Pick<ErrorReport, "errorType" | "message" | "stack">;

export function shouldIgnoreError(message: string, stack?: string): boolean {
  if (message.includes("Google Identity Services")) {
    return true;
  }

  if (message === "Rejected" && stack?.includes("registerSW")) {
    return true;
  }

  return false;
}

export function setupGlobalErrorHandler(
  onError: (report: ErrorReportInput) => void,
): void {
  window.addEventListener("error", (event) => {
    const message = event.message || "Unknown error";
    const stack = event.error?.stack;

    if (shouldIgnoreError(message, stack)) return;

    onError({
      errorType: "unhandled_error",
      message,
      stack,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;

    if (shouldIgnoreError(message, stack)) return;

    onError({
      errorType: "unhandled_error",
      message,
      stack,
    });
  });
}
