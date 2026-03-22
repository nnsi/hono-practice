import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  TIMER_STORAGE_PREFIX,
  type TimerPersistData,
  type TimerStorageAdapter,
  createUseTimer,
  getTimerStorageKey,
} from "@packages/frontend-shared";
import AsyncStorage from "@react-native-async-storage/async-storage";

let timerCache: Map<string, TimerPersistData> = new Map();

async function loadTimerCache() {
  const allKeys = await AsyncStorage.getAllKeys();
  const timerKeys = allKeys.filter((k) => k.startsWith(TIMER_STORAGE_PREFIX));
  if (timerKeys.length === 0) {
    timerCache = new Map();
    return;
  }
  const pairs = await AsyncStorage.multiGet(timerKeys);
  const newCache = new Map<string, TimerPersistData>();
  for (const [key, value] of pairs) {
    if (value) {
      try {
        newCache.set(key, JSON.parse(value));
      } catch {
        // ignore corrupt data
      }
    }
  }
  timerCache = newCache;
}

const asyncStorageAdapter: TimerStorageAdapter = {
  async restore(key) {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as TimerPersistData;
    } catch {
      AsyncStorage.removeItem(key);
      return null;
    }
  },
  persist(key, data) {
    AsyncStorage.setItem(key, JSON.stringify(data));
    timerCache.set(key, data);
  },
  remove(key) {
    AsyncStorage.removeItem(key);
    timerCache.delete(key);
  },
  isOtherTimerRunning(excludeKey) {
    for (const [key, data] of timerCache) {
      if (key !== excludeKey && data.isRunning) return true;
    }
    return false;
  },
  init() {
    loadTimerCache();
  },
};

export const useTimer = createUseTimer({
  react: { useState, useCallback, useEffect, useMemo },
  useRef,
  storage: asyncStorageAdapter,
});

export { getTimerStorageKey };
