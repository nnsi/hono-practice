import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  TIMER_STORAGE_PREFIX,
  type TimerPersistData,
  type TimerStorageAdapter,
  createUseTimer,
  getTimerStorageKey,
} from "@packages/frontend-shared";

const localStorageAdapter: TimerStorageAdapter = {
  restore(key) {
    const stored = localStorage.getItem(key);
    if (!stored) return Promise.resolve(null);
    try {
      return Promise.resolve(JSON.parse(stored) as TimerPersistData);
    } catch {
      localStorage.removeItem(key);
      return Promise.resolve(null);
    }
  },
  persist(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },
  remove(key) {
    localStorage.removeItem(key);
  },
  isOtherTimerRunning(excludeKey) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TIMER_STORAGE_PREFIX) && key !== excludeKey) {
        try {
          const data: TimerPersistData = JSON.parse(
            localStorage.getItem(key) || "",
          );
          if (data.isRunning) return true;
        } catch {
          // ignore
        }
      }
    }
    return false;
  },
};

export const useTimer = createUseTimer({
  react: { useState, useCallback, useEffect, useMemo },
  useRef,
  storage: localStorageAdapter,
});

export { getTimerStorageKey };
