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
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { apiClient } from "../../api/apiClient";
import { SETTINGS_KEY } from "./useAppSettings";

const listeners = new Set<() => void>();
const FLUSH_RETRY_MS = 30_000;

let currentPreference = createDefaultLocalTabPreference();
let loadPromise: Promise<void> | null = null;
let flushRetryTimer: ReturnType<typeof setTimeout> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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

async function readSettingsObject() {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function ensureLoaded() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const settings = await readSettingsObject();
      currentPreference = coerceLocalTabPreference(settings.tabPreference);
      emit();
    })();
  }
  await loadPromise;
}

async function writeTabPreferenceToStorage(preference: LocalTabPreference) {
  const settings = await readSettingsObject();
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...settings, tabPreference: preference }),
  );
}

async function updateCurrentPreference(preference: LocalTabPreference) {
  const previous = currentPreference;
  currentPreference = preference;
  if (preference.syncStatus === "synced") {
    clearFlushRetry();
  }
  emit();
  try {
    await writeTabPreferenceToStorage(preference);
  } catch (error) {
    currentPreference = previous;
    emit();
    throw error;
  }
}

void ensureLoaded();

function subscribe(listener: () => void) {
  listeners.add(listener);
  void ensureLoaded();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return currentPreference;
}

export function useTabPreference() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { preference };
}

export async function clearStoredTabPreference() {
  clearFlushRetry();
  const previous = currentPreference;
  const next = createDefaultLocalTabPreference();
  const settings = await readSettingsObject();
  delete settings.tabPreference;
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    currentPreference = next;
    emit();
  } catch (error) {
    currentPreference = previous;
    emit();
    throw error;
  }
}

export async function savePendingTabPreference(tabs: readonly TabKey[]) {
  await ensureLoaded();
  const next = createPendingTabPreference(currentPreference, tabs);
  await updateCurrentPreference(next);
  void flushPendingTabPreference();
  return next;
}

export async function reconcileTabPreferenceFromServer(server: TabPreference) {
  await ensureLoaded();
  const next = applyServerTabPreference(currentPreference, server);
  await updateCurrentPreference(next);
  return next;
}

export async function flushPendingTabPreference() {
  await ensureLoaded();
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
      await updateCurrentPreference(next);
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
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        void flushPendingTabPreference();
      }
    });
    return () => {
      unsub();
    };
  }, []);
}
