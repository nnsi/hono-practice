import {
  defaultRecordingModeConfig,
  parseRecordingModeConfig,
} from "@packages/domain/activity/recordingModeConfig";

import type {
  ReactHooks,
  RecordingModeProps,
  UseRecordingModeHook,
} from "../types";

type UseCounterModeDeps = {
  react: Pick<ReactHooks, "useState">;
};

export type CounterModeViewModel = {
  // タブ
  activeTab: "counter" | "manual";
  setActiveTab: (tab: "counter" | "manual") => void;

  // カウンタータブ
  steps: number[];
  recordStep: (step: number) => void;
  todayTotal: number;
  isSubmitting: boolean;

  // 手動入力タブ
  quantity: string;
  setQuantity: (v: string) => void;
  memo: string;
  setMemo: (v: string) => void;
  submitManual: () => void;

  // 共通
  selectedKindId: string | null;
  setSelectedKindId: (id: string | null) => void;
  kinds: RecordingModeProps["kinds"];
  quantityUnit: string;
};

function resolveSteps(configRaw: string | null | undefined): number[] {
  const config = parseRecordingModeConfig(configRaw ?? null);
  if (config?.mode === "counter") return config.steps;
  const fallback = defaultRecordingModeConfig("counter");
  return fallback?.mode === "counter" ? fallback.steps : [1, 10, 100];
}

export function createUseCounterMode(
  deps: UseCounterModeDeps,
): UseRecordingModeHook<"counter"> {
  return function useCounterMode(
    props: RecordingModeProps,
  ): CounterModeViewModel {
    const [activeTab, setActiveTab] = deps.react.useState<"counter" | "manual">(
      "counter",
    );
    const [isSubmitting, setIsSubmitting] = deps.react.useState(false);
    const [quantity, setQuantity] = deps.react.useState("");
    const [memo, setMemo] = deps.react.useState("");
    const [selectedKindId, setSelectedKindId] = deps.react.useState<
      string | null
    >(null);

    const steps = resolveSteps(props.activity.recordingModeConfig);

    const todayTotal = (props.todayLogs ?? []).reduce(
      (sum, log) => sum + (log.quantity ?? 0),
      0,
    );

    const recordStep = (step: number) => {
      if (isSubmitting || props.isSubmitting) return;
      if (!Number.isInteger(step) || step < 0 || step > 999999) return;
      setIsSubmitting(true);
      props
        .onSave({ quantity: step, activityKindId: selectedKindId, memo: "" })
        .finally(() => setIsSubmitting(false));
    };

    const submitManual = () => {
      if (isSubmitting || props.isSubmitting) return;
      const parsed = Number(quantity) || 0;
      if (parsed < 0 || parsed > 999999) return;
      if (!Number.isInteger(parsed)) return;
      setIsSubmitting(true);
      props
        .onSave({
          quantity: parsed,
          activityKindId: selectedKindId,
          memo,
        })
        .finally(() => setIsSubmitting(false));
    };

    return {
      activeTab,
      setActiveTab,
      steps,
      recordStep,
      todayTotal,
      isSubmitting: isSubmitting || props.isSubmitting,
      quantity,
      setQuantity,
      memo,
      setMemo,
      submitManual,
      selectedKindId,
      setSelectedKindId,
      kinds: props.kinds,
      quantityUnit: props.activity.quantityUnit,
    };
  };
}
