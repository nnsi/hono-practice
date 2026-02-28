import { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type TimerPersistData = {
  activityId: string;
  startTime: number;
  isRunning: boolean;
};

const STORAGE_PREFIX = "timer_";

function getStorageKey(activityId: string) {
  return `${STORAGE_PREFIX}${activityId}`;
}

/**
 * AsyncStorage cache to avoid repeated async reads when checking
 * whether another timer is running (mirrors localStorage iteration in frontend-v2).
 */
let timerCache: Map<string, TimerPersistData> = new Map();

async function loadTimerCache() {
  const allKeys = await AsyncStorage.getAllKeys();
  const timerKeys = allKeys.filter((k) => k.startsWith(STORAGE_PREFIX));
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

export function useTimer(activityId: string) {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // startTimeRefを同期
  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  // ストレージから復元
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(getStorageKey(activityId)).then((stored) => {
      if (cancelled || !stored) return;
      try {
        const data: TimerPersistData = JSON.parse(stored);
        if (data.isRunning && data.startTime) {
          setStartTime(data.startTime);
          setElapsedTime(Date.now() - data.startTime);
          setIsRunning(true);
        }
      } catch {
        AsyncStorage.removeItem(getStorageKey(activityId));
      }
    });
    // Also load the cache on mount for the "other timer running" check
    loadTimerCache();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  // インターバル管理
  useEffect(() => {
    if (isRunning && startTime != null) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current != null) {
          setElapsedTime(Date.now() - startTimeRef.current);
        }
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, startTime]);

  const start = useCallback(() => {
    // Refresh cache then check for other running timers
    // Since loadTimerCache is async but start() must return boolean synchronously
    // (matching frontend-v2), we use the cached values.
    const storageKey = getStorageKey(activityId);
    for (const [key, data] of timerCache) {
      if (key !== storageKey && data.isRunning) {
        return false;
      }
    }

    const now = Date.now();
    const newStartTime = now - elapsedTime;
    setStartTime(newStartTime);
    setIsRunning(true);

    const persist: TimerPersistData = {
      activityId,
      startTime: newStartTime,
      isRunning: true,
    };
    const json = JSON.stringify(persist);
    AsyncStorage.setItem(storageKey, json);
    timerCache.set(storageKey, persist);

    return true;
  }, [activityId, elapsedTime]);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const storageKey = getStorageKey(activityId);
    AsyncStorage.removeItem(storageKey);
    timerCache.delete(storageKey);
  }, [activityId]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const storageKey = getStorageKey(activityId);
    AsyncStorage.removeItem(storageKey);
    timerCache.delete(storageKey);
  }, [activityId]);

  const getElapsedSeconds = useCallback(
    () => Math.floor(elapsedTime / 1000),
    [elapsedTime],
  );

  // タイマー開始時刻（Date）を取得
  const getStartDate = useCallback(
    () => (startTime != null ? new Date(startTime) : null),
    [startTime],
  );

  return {
    isRunning,
    elapsedTime,
    start,
    stop,
    reset,
    getElapsedSeconds,
    getStartDate,
  };
}
