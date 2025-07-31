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

  const storageKey = `timer_${activityId}`;

  // Restore state from storage
  useEffect(() => {
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
      } catch (e) {
        await storage.removeItem(storageKey);
      }
    };

    restoreTimer();
  }, [activityId, storageKey, storage, notification]);

  // Timer update logic
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

  // Save state to storage when changed
  useEffect(() => {
    const saveTimer = async () => {
      if (isRunning && startTime) {
        const data: TimerPersistData = {
          activityId,
          startTime,
          isRunning,
        };
        await storage.setItem(storageKey, JSON.stringify(data));
      } else if (!isRunning && elapsedTime === 0) {
        await storage.removeItem(storageKey);
      }
    };

    saveTimer();
  }, [isRunning, startTime, elapsedTime, activityId, storageKey, storage]);

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
        } catch (e) {
          // Ignore errors
        }
      }

      const now = Date.now();
      setStartTime(now - elapsedTime);
      setIsRunning(true);

      if (eventBus) {
        eventBus.emit("timer:started", { activityId });
      }
    }
  }, [isRunning, elapsedTime, activityId, storage, notification, eventBus]);

  const stop = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current && timer) {
        timer.clearInterval(intervalRef.current);
      }

      if (eventBus) {
        eventBus.emit("timer:stopped", { activityId, elapsedTime });
      }
    }
  }, [isRunning, activityId, elapsedTime, eventBus, timer]);

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
