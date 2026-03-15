import type {
  ReactHooks,
  RecordingModeProps,
  UseRecordingModeHook,
} from "../types";

type UseManualModeDeps = {
  react: Pick<ReactHooks, "useState">;
};

export type ManualModeViewModel = {
  quantity: string;
  setQuantity: (v: string) => void;
  memo: string;
  setMemo: (v: string) => void;
  selectedKindId: string | null;
  setSelectedKindId: (id: string | null) => void;
  submit: () => void;
  isSubmitting: boolean;
  kinds: RecordingModeProps["kinds"];
  quantityUnit: string;
};

export function createUseManualMode(
  deps: UseManualModeDeps,
): UseRecordingModeHook<"manual"> {
  return function useManualMode(
    props: RecordingModeProps,
  ): ManualModeViewModel {
    const [quantity, setQuantity] = deps.react.useState("1");
    const [memo, setMemo] = deps.react.useState("");
    const [selectedKindId, setSelectedKindId] = deps.react.useState<
      string | null
    >(null);

    const submit = () => {
      const parsed = quantity !== "" ? Number(quantity) : null;
      if (parsed !== null && !Number.isFinite(parsed)) return;
      props.onSave({ quantity: parsed, memo, activityKindId: selectedKindId });
    };

    return {
      quantity,
      setQuantity,
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
