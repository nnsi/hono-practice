import {
  convertSecondsToUnit,
  generateTimeMemo,
  getTimeUnitType,
  isTimeUnit,
} from "@packages/domain/time/timeUtils";

import type { TimerReturn } from "../recording-modes/types";
import type { ActivityBase, ReactHooks } from "./types";

type UseLogFormDeps = {
  react: Pick<ReactHooks, "useState">;
  useActivityKinds: (activityId: string) => {
    kinds: { id: string; name: string; color: string | null }[];
  };
  useTimer: (activityId: string) => TimerReturn;
  activityLogRepository: {
    createActivityLog: (data: {
      activityId: string;
      activityKindId: string | null;
      quantity: number | null;
      memo: string;
      date: string;
      time: string | null;
      taskId: string | null;
    }) => Promise<unknown>;
  };
  syncEngine: { syncActivityLogs: () => Promise<unknown> };
};

export function createUseLogForm(deps: UseLogFormDeps) {
  const {
    react: { useState },
    useActivityKinds,
    useTimer,
    activityLogRepository,
    syncEngine,
  } = deps;

  return function useLogForm(
    activity: ActivityBase,
    date: string,
    onDone: () => void,
  ) {
    const [activeTab, setActiveTab] = useState<"manual" | "timer">(
      isTimeUnit(activity.quantityUnit) ? "timer" : "manual",
    );
    const [quantity, setQuantity] = useState("1");
    const [memo, setMemo] = useState("");
    const [selectedKindId, setSelectedKindId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { kinds } = useActivityKinds(activity.id);
    const timer = useTimer(activity.id);

    const timerEnabled = isTimeUnit(activity.quantityUnit);
    const timeUnitType = getTimeUnitType(activity.quantityUnit);
    const effectiveTab = timerEnabled && timer.isRunning ? "timer" : activeTab;

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
        taskId: null,
      });
      void syncEngine.syncActivityLogs().catch(() => {});
    };

    const handleManualSubmit = async () => {
      const parsed = quantity !== "" ? Number(quantity) : null;
      if (parsed !== null && !Number.isFinite(parsed)) return;
      if (parsed !== null && (parsed < 0 || parsed > 999999)) return;
      setIsSubmitting(true);
      try {
        await saveLog({ quantity: parsed, memo, selectedKindId });
        onDone();
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleTimerSave = async () => {
      setIsSubmitting(true);
      try {
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
        onDone();
      } finally {
        setIsSubmitting(false);
      }
    };

    return {
      timerEnabled,
      effectiveTab,
      activeTab,
      setActiveTab,
      quantity,
      setQuantity,
      memo,
      setMemo,
      selectedKindId,
      setSelectedKindId,
      isSubmitting,
      kinds,
      timer,
      timeUnitType,
      handleManualSubmit,
      handleTimerSave,
    };
  };
}
