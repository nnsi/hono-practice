import { useState, useEffect, useRef, useCallback } from "react";

type TimerPersistData = {
  activityId: string;
  startTime: number;
  isRunning: boolean;
};

const STORAGE_PREFIX = "timer_";

function getStorageKey(activityId: string) {
  return `${STORAGE_PREFIX}${activityId}`;
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
    const stored = localStorage.getItem(getStorageKey(activityId));
    if (!stored) return;
    try {
      const data: TimerPersistData = JSON.parse(stored);
      if (data.isRunning && data.startTime) {
        setStartTime(data.startTime);
        setElapsedTime(Date.now() - data.startTime);
        setIsRunning(true);
      }
    } catch {
      localStorage.removeItem(getStorageKey(activityId));
    }
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
    // 他のタイマーが動作中かチェック
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX) && key !== getStorageKey(activityId)) {
        try {
          const data: TimerPersistData = JSON.parse(
            localStorage.getItem(key) || "",
          );
          if (data.isRunning) return false;
        } catch {
          // ignore
        }
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
    localStorage.setItem(getStorageKey(activityId), JSON.stringify(persist));
    return true;
  }, [activityId, elapsedTime]);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    localStorage.removeItem(getStorageKey(activityId));
  }, [activityId]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    localStorage.removeItem(getStorageKey(activityId));
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
