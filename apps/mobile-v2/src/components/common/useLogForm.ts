import { useState, useCallback, useEffect, useRef } from "react";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import {
  isTimeUnit,
  getTimeUnitType,
  convertSecondsToUnit,
  generateTimeMemo,
  type TimeUnitType,
} from "@packages/domain/time/timeUtils";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
};

type TimerState = {
  isRunning: boolean;
  elapsedMs: number;
  startedAt: number | null;
};

function useActivityTimer() {
  const [state, setState] = useState<TimerState>({
    isRunning: false,
    elapsedMs: 0,
    startedAt: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (state.isRunning && state.startedAt != null) {
      intervalRef.current = setInterval(() => {
        if (stateRef.current.startedAt != null) {
          setState((s) => ({
            ...s,
            elapsedMs: Date.now() - s.startedAt!,
          }));
        }
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.startedAt]);

  const start = useCallback(() => {
    setState((s) => {
      const now = Date.now();
      const newStart = now - s.elapsedMs;
      return { isRunning: true, elapsedMs: s.elapsedMs, startedAt: newStart };
    });
  }, []);

  const stop = useCallback(() => {
    setState((s) => ({ ...s, isRunning: false }));
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(() => {
    setState({ isRunning: false, elapsedMs: 0, startedAt: null });
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const getElapsedSeconds = useCallback(
    () => Math.floor(stateRef.current.elapsedMs / 1000),
    [],
  );

  const getStartDate = useCallback(
    () =>
      stateRef.current.startedAt != null
        ? new Date(stateRef.current.startedAt)
        : null,
    [],
  );

  return {
    isRunning: state.isRunning,
    elapsedTime: state.elapsedMs,
    start,
    stop,
    reset,
    getElapsedSeconds,
    getStartDate,
  };
}

export function useLogForm(
  activity: Activity,
  date: string,
  onDone: () => void,
) {
  // state
  const [activeTab, setActiveTab] = useState<"manual" | "timer">(
    isTimeUnit(activity.quantityUnit) ? "timer" : "manual",
  );
  const [quantity, setQuantity] = useState("1");
  const [memo, setMemo] = useState("");
  const [selectedKindId, setSelectedKindId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // data
  const { kinds } = useActivityKinds(activity.id);
  const timer = useActivityTimer();

  // computed
  const timerEnabled = isTimeUnit(activity.quantityUnit);
  const timeUnitType = getTimeUnitType(activity.quantityUnit);
  const effectiveTab =
    timerEnabled && timer.isRunning ? "timer" : activeTab;

  // handlers
  const saveLog = async (params: {
    quantity: number | null;
    memo: string;
    selectedKindId: string | null;
  }) => {
    await activityLogRepository.createActivityLog({
      activityId: activity.id,
      activityKindId: params.selectedKindId,
      quantity: params.quantity,
      memo: params.memo,
      date,
      time: null,
    });
    syncEngine.syncActivityLogs();
  };

  const handleManualSubmit = async () => {
    const parsed = quantity !== "" ? Number(quantity) : null;
    if (parsed !== null && !Number.isFinite(parsed)) return;
    setIsSubmitting(true);
    await saveLog({
      quantity: parsed,
      memo,
      selectedKindId,
    });
    setIsSubmitting(false);
    onDone();
  };

  const handleTimerSave = async () => {
    setIsSubmitting(true);
    const seconds = timer.getElapsedSeconds();
    const convertedQuantity = convertSecondsToUnit(seconds, timeUnitType);
    const startDate = timer.getStartDate();
    const endDate = new Date();
    const timerMemo = startDate ? generateTimeMemo(startDate, endDate) : "";

    await saveLog({
      quantity: convertedQuantity,
      memo: timerMemo,
      selectedKindId,
    });
    timer.reset();
    setIsSubmitting(false);
    onDone();
  };

  return {
    // tab
    timerEnabled,
    effectiveTab,
    activeTab,
    setActiveTab,
    // form state
    quantity,
    setQuantity,
    memo,
    setMemo,
    selectedKindId,
    setSelectedKindId,
    isSubmitting,
    // data
    kinds,
    timer,
    // computed
    timeUnitType,
    // handlers
    handleManualSubmit,
    handleTimerSave,
  };
}
