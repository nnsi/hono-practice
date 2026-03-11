import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { Minus, Plus, RotateCcw } from "lucide-react";

import { KindSelector } from "../parts/KindSelector";
import { MemoInput } from "../parts/MemoInput";
import { SaveButton } from "../parts/SaveButton";
import { useCounterMode } from "./useCounterMode";

export function CounterMode(props: RecordingModeProps) {
  const vm = useCounterMode(props);

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

      <div className="flex flex-col items-center py-4">
        <div className="text-5xl font-bold tabular-nums tracking-tight">
          {vm.count}
        </div>
        {vm.quantityUnit && (
          <div className="text-sm text-gray-500 mt-1">{vm.quantityUnit}</div>
        )}
      </div>

      <div className="space-y-2">
        {vm.steps.map((step) => (
          <div key={step} className="flex gap-2">
            <button
              type="button"
              onClick={() => vm.decrement(step)}
              disabled={vm.count < step}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Minus size={16} />
              {step}
            </button>
            <button
              type="button"
              onClick={() => vm.increment(step)}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus size={16} />
              {step}
            </button>
          </div>
        ))}
      </div>

      {vm.count > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={vm.reset}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw size={14} />
            リセット
          </button>
        </div>
      )}

      <MemoInput value={vm.memo} onChange={vm.setMemo} />
      <SaveButton type="submit" disabled={vm.isSubmitting} />
    </form>
  );
}
