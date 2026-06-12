import {
  type LocalTabPreference,
  coerceTabPreference,
} from "@packages/domain/user/tabPreferenceSchema";
import {
  resolveFlushedTabPreference,
  shouldRetryTabPreferenceFlush,
} from "@packages/domain/user/tabPreferenceSync";

import type { TabPreferenceFlushTransport } from "./createTabPreferenceStore.types";

/**
 * pending な tab preference を server へ flush し、サーバ応答で reconcile する。
 * - pending でなければ retry を解除して即返す
 * - 非 2xx かつ retry 可能 status / 例外時は scheduleRetry を呼ぶ
 * 状態（currentPreference）は getCurrent / updateCurrent 経由で読み書きする。
 */
export async function flushTabPreference(deps: {
  transport: TabPreferenceFlushTransport;
  getCurrent: () => LocalTabPreference;
  updateCurrent: (next: LocalTabPreference) => Promise<void>;
  clearRetry: () => void;
  scheduleRetry: () => void;
}): Promise<LocalTabPreference> {
  const { transport, getCurrent, updateCurrent, clearRetry, scheduleRetry } =
    deps;

  const pending = getCurrent();
  if (pending.syncStatus !== "pending") {
    clearRetry();
    return pending;
  }

  try {
    const res = await transport.putTabPreference({
      tabs: pending.tabs,
      updatedAt: pending.updatedAt,
    });
    if (!res.ok) {
      if (shouldRetryTabPreferenceFlush(res.status)) scheduleRetry();
      return getCurrent();
    }

    const server = coerceTabPreference(await res.json());
    const next = resolveFlushedTabPreference(getCurrent(), pending, server);
    if (next !== getCurrent()) await updateCurrent(next);
    return next;
  } catch {
    scheduleRetry();
    return getCurrent();
  }
}
