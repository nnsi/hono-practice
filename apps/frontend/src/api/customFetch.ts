import { createAuthenticatedFetch } from "@packages/auth-client";

import { tokenHolder } from "./tokenHolder";

// auth/authController.ts (composition root) で transport を作った後に
// setRefreshAccessToken で配線する。module 評価時は no-op だが、
// 実際の API 呼び出しが発生する頃には必ず配線済み。
let refreshAccessTokenImpl: () => Promise<string | null> = async () => null;

export function setRefreshAccessToken(fn: () => Promise<string | null>): void {
  refreshAccessTokenImpl = fn;
}

const { fetch } = createAuthenticatedFetch({
  tokenSource: tokenHolder,
  refreshAccessToken: () => refreshAccessTokenImpl(),
  includeCredentialsForAuthEndpoints: true,
});

export { fetch as customFetch };
