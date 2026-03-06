import type { ErrorReport } from "./errorReporter";

type ErrorReportInput = Pick<ErrorReport, "errorType" | "message" | "stack">;

export function setupGlobalErrorHandler(
  onError: (report: ErrorReportInput) => void,
): void {
  window.addEventListener("error", (event) => {
    onError({
      errorType: "unhandled_error",
      message: event.message || "Unknown error",
      stack: event.error?.stack,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    onError({
      errorType: "unhandled_error",
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
