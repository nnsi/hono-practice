import { useCallback, useEffect, useRef, useState } from "react";

import { Alert } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { eventBus } from "../utils/eventBus";

type TimerPersistData = {
  activityId: string;
  startTime: number;
  pausedTime?: number;
  isRunning: boolean;
};

type UseTimerReturn = {
  isRunning: boolean;
  elapsedTime: number;
  start: () => void;
  stop: () => void;
  reset: () => void;
  getFormattedTime: () => string;
  getElapsedSeconds: () => number;
};

export const useTimer = (activityId: string): UseTimerReturn => {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const storageKey = `@timer_${activityId}`;

  // AsyncStorageから状態を復元
  useEffect(() => {
    const restoreTimer = async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const data: TimerPersistData = JSON.parse(stored);
          if (data.isRunning && data.startTime) {
            const elapsed =
              Date.now() - data.startTime + (data.pausedTime || 0);
            setElapsedTime(elapsed);
            setStartTime(data.startTime);
            setIsRunning(true);

            Alert.alert("タイマー継続中", "前回のタイマーを継続しています");
          }
        }
      } catch (e) {
        await AsyncStorage.removeItem(storageKey);
      }
    };

    restoreTimer();
  }, [activityId, storageKey]);

  // タイマーの更新ロジック
  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100); // 100msごとに更新

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRunning, startTime]);

  // 状態変更時にAsyncStorageに保存
  useEffect(() => {
    const saveTimer = async () => {
      if (isRunning && startTime) {
        const data: TimerPersistData = {
          activityId,
          startTime,
          isRunning,
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      } else if (!isRunning && elapsedTime === 0) {
        await AsyncStorage.removeItem(storageKey);
      }
    };

    saveTimer();
  }, [isRunning, startTime, elapsedTime, activityId, storageKey]);

  const start = useCallback(async () => {
    if (!isRunning) {
      // 他のActivityのタイマーが動いていないかチェック
      const allKeys = await AsyncStorage.getAllKeys();
      const timerKeys = allKeys.filter((key) => key.startsWith("@timer_"));

      for (const key of timerKeys) {
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const data: TimerPersistData = JSON.parse(stored);
            if (data.isRunning && data.activityId !== activityId) {
              Alert.alert(
                "別のタイマーが実行中",
                "他のタイマーが実行中です。複数のタイマーを同時に実行することはできません。",
              );
              return;
            }
          }
        } catch (e) {
          // エラーは無視
        }
      }

      const now = Date.now();
      setStartTime(now - elapsedTime);
      setIsRunning(true);
      eventBus.emit("timer:started", { activityId });
    }
  }, [isRunning, elapsedTime, activityId]);

  const stop = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      eventBus.emit("timer:stopped", { activityId, elapsedTime });
    }
  }, [isRunning, activityId, elapsedTime]);

  const reset = useCallback(async () => {
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    await AsyncStorage.removeItem(storageKey);
    eventBus.emit("timer:reset", { activityId });
  }, [storageKey, activityId]);

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

  return {
    isRunning,
    elapsedTime,
    start,
    stop,
    reset,
    getFormattedTime,
    getElapsedSeconds,
  };
};
