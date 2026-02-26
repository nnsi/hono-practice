import { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TIMER_KEY = "actiko-timer-state";

type TimerState = {
  activityId: string;
  activityName: string;
  startedAt: number; // timestamp ms
};

export function useTimer() {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted timer on mount
  useEffect(() => {
    AsyncStorage.getItem(TIMER_KEY).then((raw) => {
      if (raw) {
        try {
          const state = JSON.parse(raw) as TimerState;
          setTimerState(state);
        } catch {
          // ignore corrupt data
        }
      }
    });
  }, []);

  // Update elapsed every second when timer is active
  useEffect(() => {
    if (timerState) {
      const tick = () =>
        setElapsed(
          Math.floor((Date.now() - timerState.startedAt) / 1000)
        );
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    setElapsed(0);
  }, [timerState]);

  const startTimer = useCallback(
    async (activityId: string, activityName: string) => {
      const state: TimerState = {
        activityId,
        activityName,
        startedAt: Date.now(),
      };
      setTimerState(state);
      await AsyncStorage.setItem(TIMER_KEY, JSON.stringify(state));
    },
    []
  );

  const stopTimer = useCallback(async () => {
    const result = timerState ? { ...timerState, elapsed } : null;
    setTimerState(null);
    setElapsed(0);
    await AsyncStorage.removeItem(TIMER_KEY);
    return result;
  }, [timerState, elapsed]);

  const cancelTimer = useCallback(async () => {
    setTimerState(null);
    setElapsed(0);
    await AsyncStorage.removeItem(TIMER_KEY);
  }, []);

  return {
    isRunning: timerState !== null,
    activityId: timerState?.activityId ?? null,
    activityName: timerState?.activityName ?? null,
    elapsed,
    startTimer,
    stopTimer,
    cancelTimer,
  };
}
