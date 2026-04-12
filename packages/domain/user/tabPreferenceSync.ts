import {
  type LocalTabPreference,
  type TabKey,
  type TabPreference,
  applyServerTabPreference,
  markTabPreferencePending,
} from "./tabPreferenceSchema";

function hasSameTabs(left: readonly TabKey[], right: readonly TabKey[]) {
  return (
    left.length === right.length &&
    left.every((tabKey, index) => tabKey === right[index])
  );
}

function hasSamePreferenceVersion(
  current: LocalTabPreference,
  request: LocalTabPreference,
) {
  return (
    current.updatedAt === request.updatedAt &&
    hasSameTabs(current.tabs, request.tabs)
  );
}

export function createPendingTabPreference(
  current: LocalTabPreference,
  tabs: readonly TabKey[],
  now = new Date(),
): LocalTabPreference {
  const currentUpdatedAt = new Date(current.updatedAt).getTime();
  const nextUpdatedAt = Number.isNaN(currentUpdatedAt)
    ? now.getTime()
    : Math.max(now.getTime(), currentUpdatedAt + 1);

  return markTabPreferencePending(tabs, new Date(nextUpdatedAt));
}

export function resolveFlushedTabPreference(
  current: LocalTabPreference,
  request: LocalTabPreference,
  server: TabPreference,
): LocalTabPreference {
  if (!hasSamePreferenceVersion(current, request)) {
    return current;
  }

  return applyServerTabPreference(current, server);
}

export function shouldRetryTabPreferenceFlush(status: number) {
  return status >= 500;
}
