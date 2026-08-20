import type { RefreshResult } from "./types";

type RefreshFailure = Exclude<RefreshResult, { kind: "ok" }>;

export function classifyRefreshFailure(status: number): RefreshFailure {
  if (status === 400 || status === 401 || status === 403) {
    return { kind: "expired" };
  }
  return { kind: "transient", reason: `status ${status}` };
}
