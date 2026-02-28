import {
  isTimeUnit,
  getTimeUnitType,
  convertSecondsToUnit,
  generateTimeMemo,
} from "@packages/domain/time/timeUtils";
import type { ReactHooks, ActivityBase } from "./types";

/**
 * Timer最小型。共通hookで使うメソッドに加え、
 * 各アプリのコンポーネントが追加プロパティに直接アクセスできるよう
 * Record<string, unknown> で拡張を許可する。
 */
type TimerReturn = {
  isRunning: boolean;
  elapsedTime: number;
  start: () => void;
  stop: () => void;
  reset: () => void;
  getElapsedSeconds: () => number;
  getStartDate: () => Date | null;
} & Record<string, unknown>;

type UseLogFormDeps = {
  react: Pick<ReactHooks, "useState">;
  useActivityKinds: (
    activityId: string,
  ) => { kinds: { id: string; name: string; color: string | null }[] };
  useTimer: (activityId: string) => TimerReturn;
  activityLogRepository: {
    createActivityLog: (data: {
      activityId: string;
      activityKindId: string | null;
      quantity: number | null;
      memo: string;
      date: string;
      time: string | null;
    }) => Promise<unknown>;
  };
  syncEngine: { syncActivityLogs: () => void };
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
    const effectiveTab =
      timerEnabled && timer.isRunning ? "timer" : activeTab;

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
      await saveLog({ quantity: parsed, memo, selectedKindId });
      setIsSubmitting(false);
      onDone();
    };

    const handleTimerSave = async () => {
      setIsSubmitting(true);
      const seconds = timer.getElapsedSeconds();
      const convertedQuantity = convertSecondsToUnit(seconds, timeUnitType);
      const startDate = timer.getStartDate();
      const endDate = new Date();
      const timerMemo = startDate
        ? generateTimeMemo(startDate, endDate)
        : "";

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
