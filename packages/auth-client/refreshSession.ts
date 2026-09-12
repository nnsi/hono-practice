import { trackServerTimeFromResponse } from "@packages/sync-engine";
import type { AuthDiagnosticObserver } from "@packages/types/authDiagnostics";
import { authResponseSchema } from "@packages/types/response";

import { emitAuthDiagnostic } from "./authDiagnosticObserver";
import { classifyRefreshFailure } from "./classifyRefreshFailure";
import type { RefreshResult } from "./types";

// body の受信も含めてタイムアウトし、一時障害は一度だけ再試行する。
// suspend 中はタイマーが遅れるため、復旧の保証は transport が永続化した
// operation nonce とサーバーの同一結果再取得に任せる。
const REFRESH_TIMEOUT_MS = 15_000;

export async function requestRefreshSession(
  request: (signal: AbortSignal) => Promise<Response>,
  onDiagnostic?: AuthDiagnosticObserver,
): Promise<RefreshResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
    const start = Date.now();
    let requestId: string | undefined;
    let status: number | undefined;
    let validatingSession = false;
    const report = (
      reason:
        | "ok"
        | "http_401"
        | "http_403"
        | "http_4xx"
        | "http_5xx"
        | "timeout"
        | "network"
        | "invalid_response",
    ) => {
      emitAuthDiagnostic(onDiagnostic, {
        event: "refresh_result",
        source: "refresh",
        reason,
        attempt: (attempt + 1) as 1 | 2,
        requestId,
        status,
        durationMs: Math.max(0, Date.now() - start),
      });
    };
    emitAuthDiagnostic(onDiagnostic, {
      event: "refresh_started",
      source: "refresh",
      attempt: (attempt + 1) as 1 | 2,
    });
    try {
      const res = await request(controller.signal);
      const id = res.headers.get("X-Request-ID");
      requestId = id && /^[a-f0-9-]{8,36}$/.test(id) ? id : undefined;
      status = res.status;
      trackServerTimeFromResponse(res);
      if (res.ok) {
        const body = await res.json();
        validatingSession = true;
        const session = authResponseSchema.parse(body);
        report("ok");
        return { kind: "ok", session };
      }
      report(
        res.status === 401
          ? "http_401"
          : res.status === 403
            ? "http_403"
            : res.status >= 500
              ? "http_5xx"
              : "http_4xx",
      );
      // 429 を即再送すると制限を悪化させる。認証は保持して後で復旧する。
      if (attempt === 0 && (res.status === 408 || res.status >= 500)) {
        emitAuthDiagnostic(onDiagnostic, {
          event: "refresh_retry",
          source: "refresh",
          status,
          requestId,
        });
        continue;
      }
      return classifyRefreshFailure(res.status);
    } catch (error) {
      report(
        controller.signal.aborted
          ? "timeout"
          : validatingSession || error instanceof SyntaxError
            ? "invalid_response"
            : "network",
      );
      if (attempt === 1) return { kind: "transient", reason: "network" };
      emitAuthDiagnostic(onDiagnostic, {
        event: "refresh_retry",
        source: "refresh",
        requestId,
        status,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
  return { kind: "transient", reason: "network" };
}
