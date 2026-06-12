import { useEffect, useSyncExternalStore } from "react";

import {
  type LocalTabPreference,
  coerceLocalTabPreference,
  createDefaultLocalTabPreference,
} from "@packages/domain/user/tabPreferenceSchema";
import { createTabPreferenceStore } from "@packages/frontend-shared";

import { apiClient } from "../../api/apiClient";
import { SETTINGS_KEY } from "./useAppSettings";

function readSettingsObjectSync(): Record<string, unknown> {
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

function readSyncInitial(): LocalTabPreference {
  if (typeof window === "undefined") return createDefaultLocalTabPreference();
  return coerceLocalTabPreference(readSettingsObjectSync().tabPreference);
}

const store = createTabPreferenceStore({
  react: { useEffect },
  useSyncExternalStore,
  storage: {
    getItem: (key) =>
      typeof window === "undefined" ? null : window.localStorage.getItem(key),
    setItem: (key, value) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, value);
    },
  },
  transport: {
    putTabPreference: (input) =>
      apiClient.user["tab-preference"].$put({ json: input }),
  },
  settingsKey: SETTINGS_KEY,
  initialLoad: "sync",
  readSyncInitial,
  subscribeExternalChange: (reload) => {
    if (typeof window === "undefined") return () => {};
    const handler = (event: StorageEvent) => {
      if (event.key !== SETTINGS_KEY) return;
      reload();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
  registerOnlineRetry: (onOnline) => {
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  },
});

export const {
  useTabPreference,
  useTabPreferenceSync,
  savePendingTabPreference,
  reconcileTabPreferenceFromServer,
  flushPendingTabPreference,
  clearStoredTabPreference,
} = store;
