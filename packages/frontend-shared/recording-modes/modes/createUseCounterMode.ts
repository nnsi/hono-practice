import {
  defaultRecordingModeConfig,
  parseRecordingModeConfig,
} from "@packages/domain/activity/recordingModeConfig";

import type { ReactHooks, RecordingModeProps } from "../types";

type UseCounterModeDeps = {
  react: Pick<ReactHooks, "useState">;
};

export type CounterModeViewModel = {
  count: number;
  steps: number[];
  increment: (step: number) => void;
  decrement: (step: number) => void;
  reset: () => void;
  memo: string;
  setMemo: (v: string) => void;
  selectedKindId: string | null;
  setSelectedKindId: (id: string | null) => void;
  submit: () => void;
  isSubmitting: boolean;
  kinds: RecordingModeProps["kinds"];
  quantityUnit: string;
};

function resolveSteps(configRaw: string | null | undefined): number[] {
  const config = parseRecordingModeConfig(configRaw ?? null);
  if (config?.mode === "counter") return config.steps;
  const fallback = defaultRecordingModeConfig("counter");
  return fallback?.mode === "counter" ? fallback.steps : [1, 10, 100];
}

export function createUseCounterMode(deps: UseCounterModeDeps) {
  return function useCounterMode(
    props: RecordingModeProps,
  ): CounterModeViewModel {
    const [count, setCount] = deps.react.useState(0);
    const [memo, setMemo] = deps.react.useState("");
    const [selectedKindId, setSelectedKindId] = deps.react.useState<
      string | null
    >(null);

    const steps = resolveSteps(props.activity.recordingModeConfig);

    const increment = (step: number) => setCount((c: number) => c + step);
    const decrement = (step: number) =>
      setCount((c: number) => Math.max(0, c - step));
    const reset = () => setCount(0);

    const submit = () => {
      props.onSave({
        quantity: count,
        memo,
        activityKindId: selectedKindId,
      });
    };

    return {
      count,
      steps,
      increment,
      decrement,
      reset,
      memo,
      setMemo,
      selectedKindId,
      setSelectedKindId,
      submit,
      isSubmitting: props.isSubmitting,
      kinds: props.kinds,
      quantityUnit: props.activity.quantityUnit,
    };
  };
}
