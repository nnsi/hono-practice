import { useCallback, useEffect, useRef, useState } from "react";

import { useToast } from "@components/ui";

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
  const intervalRef = useRef<number | null>(null);
  const { toast } = useToast();

  const storageKey = `timer_${activityId}`;

  // localStorageから状態を復元
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const data: TimerPersistData = JSON.parse(stored);
        if (data.isRunning && data.startTime) {
          const elapsed = Date.now() - data.startTime + (data.pausedTime || 0);
          setElapsedTime(elapsed);
          setStartTime(data.startTime);
          setIsRunning(true);

          // 復元時にトースト通知
          toast({
            title: "タイマー継続中",
            description: "前回のタイマーを継続しています",
          });
        }
      } catch (e) {
        console.error("Failed to restore timer state:", e);
        localStorage.removeItem(storageKey);
      }
    }
  }, [activityId, storageKey]);

  // storage eventでタブ間の同期
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const data: TimerPersistData = JSON.parse(e.newValue);
          if (data.isRunning && !isRunning) {
            // 他のタブでタイマーが開始された
            toast({
              title: "タイマーが他のタブで開始されました",
              description: "このタブのタイマーは無効になります",
              variant: "destructive",
            });
          }
        } catch (e) {
          console.error("Failed to parse storage event:", e);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [storageKey, isRunning, toast]);

  // タイマーの更新ロジック
  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = window.setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100); // 100msごとに更新

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRunning, startTime]);

  // 状態変更時にlocalStorageに保存
  useEffect(() => {
    if (isRunning && startTime) {
      const data: TimerPersistData = {
        activityId,
        startTime,
        isRunning,
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } else if (!isRunning && elapsedTime === 0) {
      localStorage.removeItem(storageKey);
    }
  }, [isRunning, startTime, elapsedTime, activityId, storageKey]);

  const start = useCallback(() => {
    if (!isRunning) {
      // 他のタブで同じActivityのタイマーが動いていないかチェック
      const allTimers = Object.keys(localStorage)
        .filter((key) => key.startsWith("timer_"))
        .map((key) => {
          try {
            return JSON.parse(
              localStorage.getItem(key) || "{}",
            ) as TimerPersistData;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const runningTimer = allTimers.find(
        (timer) => timer?.isRunning && timer?.activityId !== activityId,
      );
      if (runningTimer) {
        toast({
          title: "別のタイマーが実行中",
          description:
            "他のタブでタイマーが実行中です。複数のタイマーを同時に実行することはできません。",
          variant: "destructive",
        });
        return;
      }

      const now = Date.now();
      setStartTime(now - elapsedTime);
      setIsRunning(true);
    }
  }, [isRunning, elapsedTime, activityId, toast]);

  const stop = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isRunning]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    localStorage.removeItem(storageKey);
  }, [storageKey]);

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
