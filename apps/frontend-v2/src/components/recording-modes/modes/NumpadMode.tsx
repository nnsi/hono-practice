import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { Delete } from "lucide-react";

import { KindSelector } from "../parts/KindSelector";
import { MemoInput } from "../parts/MemoInput";
import { SaveButton } from "../parts/SaveButton";
import { useNumpadMode } from "./useNumpadMode";

const NUMPAD_KEYS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["C", "0", "backspace"],
] as const;

export function NumpadMode(props: RecordingModeProps) {
  const vm = useNumpadMode(props);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        vm.submit();
      }}
      className="space-y-4"
    >
      {vm.kinds.length > 0 && (
        <KindSelector
          kinds={vm.kinds}
          selectedKindId={vm.selectedKindId}
          onSelect={vm.setSelectedKindId}
        />
      )}

      <div className="flex items-baseline justify-end gap-1 px-2 py-3 bg-gray-50 rounded-lg">
        <span className="text-4xl font-bold tabular-nums">
          {vm.formattedDisplay}
        </span>
        {vm.quantityUnit && (
          <span className="text-sm text-gray-500">{vm.quantityUnit}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {NUMPAD_KEYS.flat().map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => vm.pressKey(key)}
            className={`py-4 text-xl font-medium rounded-lg transition-colors ${
              key === "C"
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : key === "backspace"
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            {key === "backspace" ? (
              <Delete size={20} className="mx-auto" />
            ) : (
              key
            )}
          </button>
        ))}
      </div>

      <MemoInput value={vm.memo} onChange={vm.setMemo} />
      <SaveButton
        type="button"
        onClick={vm.submit}
        disabled={vm.display === "" || vm.isSubmitting}
      />
    </form>
  );
}
