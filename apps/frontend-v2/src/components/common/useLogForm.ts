import { useState } from "react";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { useTimer } from "../../hooks/useTimer";
import { activityLogRepository } from "../../db/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { DexieActivity } from "../../db/schema";
import {
  isTimeUnit,
  getTimeUnitType,
  convertSecondsToUnit,
  generateTimeMemo,
} from "../../utils/timeUtils";

export type UseTimerReturn = ReturnType<typeof useTimer>;

export function useLogForm(
  activity: DexieActivity,
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
  const timer = useTimer(activity.id);

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

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    await saveLog({
      quantity: quantity !== "" ? Number(quantity) : null,
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
