import { useCallback, useEffect, useRef, useState } from "react";

import type {
  EventBusAdapter,
  NotificationAdapter,
  StorageAdapter,
  TimerAdapter,
} from "../adapters";

type TimerPersistData = {
  activityId: string;
  startTime: number;
  pausedTime?: number;
  isRunning: boolean;
};

export type UseTimerOptions = {
  activityId: string;
  storage: StorageAdapter;
  notification: NotificationAdapter;
  eventBus?: EventBusAdapter;
  timer?: TimerAdapter<unknown>;
};

export type UseTimerReturn = {
  isRunning: boolean;
  elapsedTime: number;
  start: () => void;
  stop: () => void;
  reset: () => void;
  getFormattedTime: () => string;
  getElapsedSeconds: () => number;
  getStartTime: () => number | null;
};

export function createUseTimer(options: UseTimerOptions): UseTimerReturn {
  const { activityId, storage, notification, eventBus, timer } = options;
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<unknown | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const storageKey = `timer_${activityId}`;

  // ストレージへの保存を行う内部関数
  const saveTimerState = useCallback(
    async (running: boolean, start: number | null, elapsed: number) => {
      if (running && start) {
        const data: TimerPersistData = {
          activityId,
          startTime: start,
          isRunning: running,
        };
        await storage.setItem(storageKey, JSON.stringify(data));
      } else if (!running && elapsed === 0) {
        await storage.removeItem(storageKey);
      }
    },
    [activityId, storageKey, storage],
  );

  // 初期化処理 - ストレージからの復元
  useEffect(() => {
    if (isInitialized) return;

    const restoreTimer = async () => {
      try {
        const stored = await storage.getItem(storageKey);
        if (stored) {
          const data: TimerPersistData = JSON.parse(stored);
          if (data.isRunning && data.startTime) {
            const elapsed =
              Date.now() - data.startTime + (data.pausedTime || 0);
            setElapsedTime(elapsed);
            setStartTime(data.startTime);
            setIsRunning(true);

            notification.toast({
              title: "タイマー継続中",
              description: "前回のタイマーを継続しています",
            });
          }
        }
      } catch (_e) {
        await storage.removeItem(storageKey);
      } finally {
        setIsInitialized(true);
      }
    };

    restoreTimer();
  }, [activityId, storageKey, storage, notification, isInitialized]);

  // Timer update logic - UIの更新なので維持
  useEffect(() => {
    if (isRunning && startTime && timer) {
      intervalRef.current = timer.setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100); // Update every 100ms

      return () => {
        if (intervalRef.current) {
          timer.clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRunning, startTime, timer]);

  const start = useCallback(async () => {
    if (!isRunning) {
      // Check if another timer is running
      const allKeys = await storage.getAllKeys();
      const timerKeys = allKeys.filter((key) => key.startsWith("timer_"));

      for (const key of timerKeys) {
        try {
          const stored = await storage.getItem(key);
          if (stored) {
            const data: TimerPersistData = JSON.parse(stored);
            if (data.isRunning && data.activityId !== activityId) {
              notification.toast({
                title: "別のタイマーが実行中",
                description:
                  "他のタイマーが実行中です。複数のタイマーを同時に実行することはできません。",
                variant: "destructive",
              });
              return;
            }
          }
        } catch (_e) {
          // Ignore errors
        }
      }

      const now = Date.now();
      const newStartTime = now - elapsedTime;
      setStartTime(newStartTime);
      setIsRunning(true);

      // 状態変更時に即座に保存
      await saveTimerState(true, newStartTime, elapsedTime);

      if (eventBus) {
        eventBus.emit("timer:started", { activityId });
      }
    }
  }, [
    isRunning,
    elapsedTime,
    activityId,
    storage,
    notification,
    eventBus,
    saveTimerState,
  ]);

  const stop = useCallback(async () => {
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current && timer) {
        timer.clearInterval(intervalRef.current);
      }

      // 停止時にストレージをクリア
      await storage.removeItem(storageKey);

      if (eventBus) {
        eventBus.emit("timer:stopped", { activityId, elapsedTime });
      }
    }
  }, [
    isRunning,
    activityId,
    elapsedTime,
    eventBus,
    timer,
    storage,
    storageKey,
  ]);

  const reset = useCallback(async () => {
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
    if (intervalRef.current && timer) {
      timer.clearInterval(intervalRef.current);
    }
    await storage.removeItem(storageKey);

    if (eventBus) {
      eventBus.emit("timer:reset", { activityId });
    }
  }, [storageKey, activityId, storage, eventBus, timer]);

  const getFormattedTime = useCallback(() => {
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [elapsedTime]);

  const getElapsedSeconds = useCallback(() => {
    return Math.floor(elapsedTime / 1000);
  }, [elapsedTime]);

  const getStartTime = useCallback(() => {
    return startTime;
  }, [startTime]);

  return {
    isRunning,
    elapsedTime,
    start,
    stop,
    reset,
    getFormattedTime,
    getElapsedSeconds,
    getStartTime,
  };
}
