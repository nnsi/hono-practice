import { useEffect, useSyncExternalStore } from "react";

import { createTabPreferenceStore } from "@packages/frontend-shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { apiClient } from "../../api/apiClient";
import { SETTINGS_KEY } from "./useAppSettings";

const store = createTabPreferenceStore({
  react: { useEffect },
  useSyncExternalStore,
  storage: {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
  },
  transport: {
    putTabPreference: (input) =>
      apiClient.user["tab-preference"].$put({ json: input }),
  },
  settingsKey: SETTINGS_KEY,
  initialLoad: "lazy",
  registerOnlineRetry: (onOnline) => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) onOnline();
    });
    return unsub;
  },
});

// 起動時に AsyncStorage から先読みする（旧実装の `void ensureLoaded()` 相当）。
void store.ensureLoaded();

export const {
  useTabPreference,
  useTabPreferenceSync,
  savePendingTabPreference,
  reconcileTabPreferenceFromServer,
  flushPendingTabPreference,
  clearStoredTabPreference,
} = store;
