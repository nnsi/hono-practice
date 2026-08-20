import type { AuthTransport } from "./types";

export type RefreshAccessTokenCallbackOptions = {
  getSessionVersion?: () => number;
  onExpired?: () => void | Promise<void>;
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
    const sessionVersion = options.getSessionVersion?.();
    const result = await transport.refreshSession();
    if (
      sessionVersion !== undefined &&
      sessionVersion !== options.getSessionVersion?.()
    ) {
      return null;
    }
    if (result.kind === "expired") {
      await options.onExpired?.();
      return null;
    }
    if (result.kind === "transient") return null;
    transport.setAccessToken(result.session.token);
    return result.session.token;
  };
}
