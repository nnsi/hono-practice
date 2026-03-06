const MAX_STACK_LENGTH = 5000;

export type ErrorReport = {
  errorType: "component_error" | "unhandled_error" | "network_error";
  message: string;
  stack?: string;
  userId?: string;
  screen?: string;
};

export type ReportErrorOptions = {
  apiUrl: string;
  platform: "ios" | "android" | "web";
};

export function reportError(
  report: ErrorReport,
  options: ReportErrorOptions,
): void {
  // Fire-and-forget: エラー監視自体がクラッシュ源になってはならない
  try {
    const body = {
      ...report,
      message: report.message.slice(0, 1000),
      stack: report.stack?.slice(0, MAX_STACK_LENGTH),
      platform: options.platform,
    };

    fetch(`${options.apiUrl}/client-errors`, {
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
