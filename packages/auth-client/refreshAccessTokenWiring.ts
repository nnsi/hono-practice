import type { AuthDiagnosticObserver } from "@packages/types/authDiagnostics";

import { emitAuthDiagnostic } from "./authDiagnosticObserver";
import type { AuthTransport } from "./types";

export type RefreshAccessTokenCallbackOptions = {
  getSessionVersion?: () => number;
  onExpired?: () => void | Promise<void>;
  onDiagnostic?: AuthDiagnosticObserver;
};

// createAuthenticatedFetch の refreshAccessToken に渡す callback を生成する。
// 401 retry の直後の本リクエストだけでなく、後続リクエストも新 token で送るには
// tokenHolder (= transport.setAccessToken の対象) も更新する必要がある。
// Web/Mobile の authController.ts (composition root) で共通に使う。
export function createRefreshAccessTokenCallback(
  transport: AuthTransport,
  options: RefreshAccessTokenCallbackOptions = {},
): () => Promise<string | null> {
  return async () => {
    emitAuthDiagnostic(options.onDiagnostic, {
      event: "refresh_callback",
      source: "api_401",
    });
    const sessionVersion = options.getSessionVersion?.();
    const result = await transport.refreshSession();
    if (
      sessionVersion !== undefined &&
      sessionVersion !== options.getSessionVersion?.()
    ) {
      emitAuthDiagnostic(options.onDiagnostic, {
        event: "refresh_callback",
        source: "api_401",
        reason: "stale_result",
      });
      return null;
    }
    if (result.kind === "expired") {
      emitAuthDiagnostic(options.onDiagnostic, {
        event: "refresh_callback",
        source: "api_401",
        reason: "refresh_expired",
      });
      await options.onExpired?.();
      return null;
    }
    if (result.kind === "transient") return null;
    transport.setAccessToken(result.session.token);
    return result.session.token;
  };
}
