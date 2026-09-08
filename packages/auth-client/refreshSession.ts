import { trackServerTimeFromResponse } from "@packages/sync-engine";
import { authResponseSchema } from "@packages/types/response";

import { classifyRefreshFailure } from "./classifyRefreshFailure";
import type { RefreshResult } from "./types";

// サーバーが rotation 済みでも応答を受信できないことがある。
// 15 秒で body の受信まで打ち切り、30 秒の grace 内に一度だけ再提示する。
const REFRESH_TIMEOUT_MS = 15_000;

export async function requestRefreshSession(
  request: (signal: AbortSignal) => Promise<Response>,
): Promise<RefreshResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
    try {
      const res = await request(controller.signal);
      trackServerTimeFromResponse(res);
      if (res.ok) {
        const session = authResponseSchema.parse(await res.json());
        return { kind: "ok", session };
      }
      // 429 を即再送すると制限を悪化させる。認証は保持して後で復旧する。
      if (attempt === 0 && (res.status === 408 || res.status >= 500)) {
        continue;
      }
      return classifyRefreshFailure(res.status);
    } catch {
      if (attempt === 1) return { kind: "transient", reason: "network" };
    } finally {
      clearTimeout(timeout);
    }
  }
  return { kind: "transient", reason: "network" };
}
