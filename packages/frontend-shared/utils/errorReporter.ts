const MAX_STACK_LENGTH = 5000;

export type ErrorReport = {
  errorType: "component_error" | "unhandled_error" | "network_error";
  message: string;
  stack?: string;
  userId?: string;
  screen?: string;
};

export type ErrorContext = {
  userId?: string;
  screen?: string;
};

export type ReportErrorOptions = {
  apiUrl: string;
  platform: "ios" | "android" | "web";
  getContext?: () => ErrorContext;
};

export function reportError(
  report: ErrorReport,
  options: ReportErrorOptions,
): void {
  // Fire-and-forget: エラー監視自体がクラッシュ源になってはならない
  try {
    let context: ErrorContext = {};
    try {
      context = options.getContext?.() ?? {};
    } catch {
      // getContext failure should not prevent error reporting
    }
    const body = {
      errorType: report.errorType,
      message: report.message.slice(0, 1000),
      stack: report.stack?.slice(0, MAX_STACK_LENGTH),
      platform: options.platform,
      userId: context.userId,
      screen: context.screen,
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
