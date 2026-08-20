import {
  type LocalTabPreference,
  type TabKey,
  type TabPreference,
  applyServerTabPreference,
  createDefaultLocalTabPreference,
} from "@packages/domain/user/tabPreferenceSchema";
import { createPendingTabPreference } from "@packages/domain/user/tabPreferenceSync";

import { createFlushRetryTimer } from "./createFlushRetryTimer";
import { createStoreSubscribe } from "./createStoreSubscribe";
import {
  clearTabPreference,
  loadTabPreference,
  writeTabPreference,
} from "./createTabPreferenceStore.storage";
import type { CreateTabPreferenceStoreDeps } from "./createTabPreferenceStore.types";
import { flushTabPreference } from "./flushTabPreference";

const FLUSH_RETRY_MS = 30_000;

export function createTabPreferenceStore(deps: CreateTabPreferenceStoreDeps) {
  const {
    react: { useEffect },
    useSyncExternalStore,
    storage,
    transport,
    settingsKey,
    initialLoad,
    readSyncInitial,
    subscribeExternalChange,
    registerOnlineRetry,
  } = deps;

  const listeners = new Set<() => void>();

  let currentPreference =
    initialLoad === "sync" && readSyncInitial
      ? readSyncInitial()
      : createDefaultLocalTabPreference();

  let loadPromise: Promise<void> | null =
    initialLoad === "sync" ? Promise.resolve() : null;

  const retryTimer = createFlushRetryTimer(FLUSH_RETRY_MS, () => {
    void flushPendingTabPreference();
  });
  const clearFlushRetry = retryTimer.clear;
  const scheduleFlushRetry = retryTimer.schedule;

  function emit() {
    for (const listener of listeners) listener();
  }

  async function ensureLoaded() {
    if (!loadPromise) {
      loadPromise = (async () => {
        currentPreference = await loadTabPreference(storage, settingsKey);
        emit();
      })();
    }
    await loadPromise;
  }

  async function updateCurrentPreference(preference: LocalTabPreference) {
    const previous = currentPreference;
    currentPreference = preference;
    if (preference.syncStatus === "synced") {
      clearFlushRetry();
    }
    emit();
    try {
      await writeTabPreference(storage, settingsKey, preference);
    } catch (error) {
      currentPreference = previous;
      emit();
      throw error;
    }
  }

  function reloadFromStorage() {
    void (async () => {
      currentPreference = await loadTabPreference(storage, settingsKey);
      emit();
    })();
  }

  const subscribe = createStoreSubscribe({
    listeners,
    onSubscribe: () => {
      if (initialLoad === "lazy") void ensureLoaded();
    },
    reload: reloadFromStorage,
    subscribeExternalChange,
  });

  function getSnapshot() {
    return currentPreference;
  }

  function useTabPreference() {
    const preference = useSyncExternalStore(
      subscribe,
      getSnapshot,
      getSnapshot,
    );
    return { preference };
  }

  async function clearStoredTabPreference() {
    clearFlushRetry();
    const previous = currentPreference;
    try {
      await clearTabPreference(storage, settingsKey);
      currentPreference = createDefaultLocalTabPreference();
      emit();
    } catch (error) {
      currentPreference = previous;
      emit();
      throw error;
    }
  }

  async function savePendingTabPreference(tabs: readonly TabKey[]) {
    await ensureLoaded();
    const next = createPendingTabPreference(currentPreference, tabs);
    await updateCurrentPreference(next);
    void flushPendingTabPreference();
    return next;
  }

  async function reconcileTabPreferenceFromServer(server: TabPreference) {
    await ensureLoaded();
    const next = applyServerTabPreference(currentPreference, server);
    await updateCurrentPreference(next);
    return next;
  }

  async function flushPendingTabPreference() {
    await ensureLoaded();
    return flushTabPreference({
      transport,
      getCurrent: () => currentPreference,
      updateCurrent: updateCurrentPreference,
      clearRetry: clearFlushRetry,
      scheduleRetry: scheduleFlushRetry,
    });
  }

  function useTabPreferenceSync() {
    useEffect(() => {
      void flushPendingTabPreference();
      const unregister = registerOnlineRetry(() => {
        void flushPendingTabPreference();
      });
      return () => {
        unregister();
      };
    }, []);
  }

  return {
    useTabPreference,
    useTabPreferenceSync,
    savePendingTabPreference,
    reconcileTabPreferenceFromServer,
    flushPendingTabPreference,
    clearStoredTabPreference,
    // lazy ロード環境の起動時先読み用（Mobile）。sync 環境では即 resolve。
    ensureLoaded,
  };
}
