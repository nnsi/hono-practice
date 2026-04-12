import { useEffect, useSyncExternalStore } from "react";

import {
  type LocalTabPreference,
  type TabKey,
  type TabPreference,
  applyServerTabPreference,
  coerceLocalTabPreference,
  coerceTabPreference,
  createDefaultLocalTabPreference,
} from "@packages/domain/user/tabPreferenceSchema";
import {
  createPendingTabPreference,
  resolveFlushedTabPreference,
  shouldRetryTabPreferenceFlush,
} from "@packages/domain/user/tabPreferenceSync";

import { apiClient } from "../../utils/apiClient";
import { SETTINGS_KEY } from "./useAppSettings";

const listeners = new Set<() => void>();
const FLUSH_RETRY_MS = 30_000;

let currentPreference =
  typeof window === "undefined"
    ? createDefaultLocalTabPreference()
    : readTabPreferenceFromStorage();
let flushRetryTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function clearFlushRetry() {
  if (flushRetryTimer === null) return;
  clearTimeout(flushRetryTimer);
  flushRetryTimer = null;
}

function scheduleFlushRetry() {
  if (flushRetryTimer !== null) return;
  flushRetryTimer = setTimeout(() => {
    flushRetryTimer = null;
    void flushPendingTabPreference();
  }, FLUSH_RETRY_MS);
}

function readSettingsObject(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readTabPreferenceFromStorage(): LocalTabPreference {
  return coerceLocalTabPreference(readSettingsObject().tabPreference);
}

function writeTabPreferenceToStorage(preference: LocalTabPreference) {
  if (typeof window === "undefined") return;
  const settings = readSettingsObject();
  window.localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...settings, tabPreference: preference }),
  );
}

function updateCurrentPreference(preference: LocalTabPreference) {
  currentPreference = preference;
  if (preference.syncStatus === "synced") {
    clearFlushRetry();
  }
  writeTabPreferenceToStorage(preference);
  emit();
}

let storageListenerAttached = false;

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (!storageListenerAttached && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageChange);
    storageListenerAttached = true;
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && storageListenerAttached) {
      window.removeEventListener("storage", handleStorageChange);
      storageListenerAttached = false;
    }
  };
}

function handleStorageChange(event: StorageEvent) {
  if (event.key !== SETTINGS_KEY) return;
  currentPreference = readTabPreferenceFromStorage();
  emit();
}

function getSnapshot() {
  return currentPreference;
}

export function useTabPreference() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { preference };
}

export function clearStoredTabPreference() {
  clearFlushRetry();
  currentPreference = createDefaultLocalTabPreference();
  if (typeof window !== "undefined") {
    const settings = readSettingsObject();
    delete settings.tabPreference;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
  emit();
}

export function savePendingTabPreference(tabs: readonly TabKey[]) {
  const next = createPendingTabPreference(currentPreference, tabs);
  updateCurrentPreference(next);
  void flushPendingTabPreference();
  return next;
}

export function reconcileTabPreferenceFromServer(server: TabPreference) {
  const next = applyServerTabPreference(currentPreference, server);
  updateCurrentPreference(next);
  return next;
}

export async function flushPendingTabPreference() {
  const pendingPreference = currentPreference;
  if (pendingPreference.syncStatus !== "pending") {
    clearFlushRetry();
    return pendingPreference;
  }

  try {
    const res = await apiClient.user["tab-preference"].$put({
      json: {
        tabs: pendingPreference.tabs,
        updatedAt: pendingPreference.updatedAt,
      },
    });
    if (!res.ok) {
      if (shouldRetryTabPreferenceFlush(res.status)) {
        scheduleFlushRetry();
      }
      return currentPreference;
    }

    const server = coerceTabPreference(await res.json());
    const next = resolveFlushedTabPreference(
      currentPreference,
      pendingPreference,
      server,
    );
    if (next !== currentPreference) {
      updateCurrentPreference(next);
    }
    return next;
  } catch {
    scheduleFlushRetry();
    return currentPreference;
  }
}

export function useTabPreferenceSync() {
  useEffect(() => {
    void flushPendingTabPreference();

    const handleOnline = () => {
      void flushPendingTabPreference();
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);
}
