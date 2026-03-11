import {
  convertSecondsToUnit,
  formatElapsedTime,
  generateTimeMemo,
  getTimeUnitType,
} from "@packages/domain/time/timeUtils";

import type { ReactHooks, RecordingModeProps, TimerReturn } from "../types";

type UseTimerModeDeps = {
  react: Pick<ReactHooks, "useState">;
  useTimer: (activityId: string) => TimerReturn;
};

export type TimerModeViewModel = {
  // タブ切替
  activeTab: "manual" | "timer";
  setActiveTab: (tab: "manual" | "timer") => void;
  effectiveTab: "manual" | "timer";
  // タイマー状態
  isRunning: boolean;
  elapsedTime: number;
  formattedTime: string;
  isStopped: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  convertedQuantity: number;
  quantityUnit: string;
  // 手動入力状態（手動タブ用）
  quantity: string;
  setQuantity: (v: string) => void;
  memo: string;
  setMemo: (v: string) => void;
  // 共通
  selectedKindId: string | null;
  setSelectedKindId: (id: string | null) => void;
  submitTimer: () => void;
  submitManual: () => void;
  isSubmitting: boolean;
  kinds: RecordingModeProps["kinds"];
};

export function createUseTimerMode(deps: UseTimerModeDeps) {
  return function useTimerMode(props: RecordingModeProps): TimerModeViewModel {
    const timer = deps.useTimer(props.activity.id);
    const [activeTab, setActiveTab] = deps.react.useState<"manual" | "timer">(
      "timer",
    );
    const [selectedKindId, setSelectedKindId] = deps.react.useState<
      string | null
    >(null);
    const [quantity, setQuantity] = deps.react.useState("1");
    const [memo, setMemo] = deps.react.useState("");
    const timeUnitType = getTimeUnitType(props.activity.quantityUnit);

    // タイマー稼働中は強制的にタイマータブ
    const effectiveTab = timer.isRunning ? "timer" : activeTab;

    return {
      activeTab,
      setActiveTab,
      effectiveTab,
      isRunning: timer.isRunning,
      elapsedTime: timer.elapsedTime,
      formattedTime: formatElapsedTime(timer.elapsedTime),
      isStopped: !timer.isRunning && timer.elapsedTime > 0,
      start: () => timer.start(),
      stop: timer.stop,
      reset: timer.reset,
      convertedQuantity: convertSecondsToUnit(
        timer.getElapsedSeconds(),
        timeUnitType,
      ),
      quantityUnit: props.activity.quantityUnit,
      quantity,
      setQuantity,
      memo,
      setMemo,
      selectedKindId,
      setSelectedKindId,
      submitTimer: () => {
        const seconds = timer.getElapsedSeconds();
        const qty = convertSecondsToUnit(seconds, timeUnitType);
        const startDate = timer.getStartDate();
        const timerMemo = startDate
          ? generateTimeMemo(startDate, new Date())
          : "";
        props.onSave({
          quantity: qty,
          memo: timerMemo,
          activityKindId: selectedKindId,
        });
        timer.reset();
      },
      submitManual: () => {
        const parsed = quantity !== "" ? Number(quantity) : null;
        if (parsed !== null && !Number.isFinite(parsed)) return;
        props.onSave({
          quantity: parsed,
          memo,
          activityKindId: selectedKindId,
        });
      },
      isSubmitting: props.isSubmitting,
      kinds: props.kinds,
    };
  };
}
