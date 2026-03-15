import type {
  ReactHooks,
  RecordingModeProps,
  UseRecordingModeHook,
} from "../types";

type UseNumpadModeDeps = {
  react: Pick<ReactHooks, "useState">;
};

const MAX_DIGITS = 10;

export type NumpadModeViewModel = {
  display: string;
  formattedDisplay: string;
  pressKey: (key: string) => void;
  memo: string;
  setMemo: (v: string) => void;
  selectedKindId: string | null;
  setSelectedKindId: (id: string | null) => void;
  pasteFromClipboard: (text: string) => void;
  submit: () => void;
  isSubmitting: boolean;
  kinds: RecordingModeProps["kinds"];
  quantityUnit: string;
};

function formatNumber(s: string): string {
  if (!s) return "0";
  return Number(s).toLocaleString();
}

export function createUseNumpadMode(
  deps: UseNumpadModeDeps,
): UseRecordingModeHook<"numpad"> {
  return function useNumpadMode(
    props: RecordingModeProps,
  ): NumpadModeViewModel {
    const [display, setDisplay] = deps.react.useState("");
    const [memo, setMemo] = deps.react.useState("");
    const [selectedKindId, setSelectedKindId] = deps.react.useState<
      string | null
    >(null);

    const pressKey = (key: string) => {
      if (key === "C") {
        setDisplay("");
        return;
      }
      if (key === "backspace") {
        setDisplay((d: string) => d.slice(0, -1));
        return;
      }
      if (/^[0-9]$/.test(key)) {
        setDisplay((d: string) => {
          if (d.length >= MAX_DIGITS) return d;
          if (d === "" && key === "0") return "";
          return d + key;
        });
      }
    };

    const pasteFromClipboard = (text: string) => {
      const digits = text
        .replace(/[^0-9]/g, "")
        .replace(/^0+/, "")
        .slice(0, MAX_DIGITS);
      if (digits) setDisplay(digits);
    };

    const submit = () => {
      const value = Number(display) || 0;
      if (value === 0) return;
      props.onSave({
        quantity: value,
        memo,
        activityKindId: selectedKindId,
      });
    };

    return {
      display,
      formattedDisplay: formatNumber(display),
      pressKey,
      pasteFromClipboard,
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
