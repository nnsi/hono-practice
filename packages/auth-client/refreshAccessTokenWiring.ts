import type { AuthTransport } from "./types";

// createAuthenticatedFetch の refreshAccessToken に渡す callback を生成する。
// 401 retry の直後の本リクエストだけでなく、後続リクエストも新 token で送るには
// tokenHolder (= transport.setAccessToken の対象) も更新する必要がある。
// Web/Mobile の authController.ts (composition root) で共通に使う。
export function createRefreshAccessTokenCallback(
  transport: AuthTransport,
): () => Promise<string | null> {
  return async () => {
    const result = await transport.refreshSession();
    if (result.kind !== "ok") return null;
    transport.setAccessToken(result.session.token);
    return result.session.token;
  };
}
