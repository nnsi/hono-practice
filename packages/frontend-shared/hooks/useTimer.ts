import type { ReactHooks } from "./types";

export type TimerPersistData = {
  activityId: string;
  startTime: number;
  isRunning: boolean;
};

export type TimerStorageAdapter = {
  /** Async restore of persisted timer data */
  restore(key: string): Promise<TimerPersistData | null>;
  /** Persist timer data (fire-and-forget) */
  persist(key: string, data: TimerPersistData): void;
  /** Remove persisted timer data (fire-and-forget) */
  remove(key: string): void;
  /** Synchronously check if another timer is running (excluding the given key) */
  isOtherTimerRunning(excludeKey: string): boolean;
  /** Optional init called on mount (e.g., to warm a cache) */
  init?(): void;
};

const STORAGE_PREFIX = "timer_";

export function getTimerStorageKey(activityId: string): string {
  return `${STORAGE_PREFIX}${activityId}`;
}

export { STORAGE_PREFIX as TIMER_STORAGE_PREFIX };

type UseTimerDeps = {
  react: Pick<ReactHooks, "useState" | "useCallback" | "useEffect" | "useMemo">;
  useRef: <T>(initial: T) => { current: T };
  storage: TimerStorageAdapter;
};

export function createUseTimer(deps: UseTimerDeps) {
  const {
    react: { useState, useCallback, useEffect },
    useRef,
    storage,
  } = deps;

  return function useTimer(activityId: string) {
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
      storage.init?.();
      storage.restore(getTimerStorageKey(activityId)).then((data) => {
        if (cancelled) return;
        if (data?.isRunning && data.startTime) {
          setStartTime(data.startTime);
          setElapsedTime(Date.now() - data.startTime);
          setIsRunning(true);
        }
      });
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
      const storageKey = getTimerStorageKey(activityId);
      if (storage.isOtherTimerRunning(storageKey)) return false;

      const now = Date.now();
      const newStartTime = now - elapsedTime;
      setStartTime(newStartTime);
      setIsRunning(true);
      storage.persist(storageKey, {
        activityId,
        startTime: newStartTime,
        isRunning: true,
      });
      return true;
    }, [activityId, elapsedTime]);

    const stop = useCallback(() => {
      setIsRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      storage.remove(getTimerStorageKey(activityId));
    }, [activityId]);

    const reset = useCallback(() => {
      setIsRunning(false);
      setStartTime(null);
      setElapsedTime(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      storage.remove(getTimerStorageKey(activityId));
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
  };
}
