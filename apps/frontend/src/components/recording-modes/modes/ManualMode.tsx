import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";

import { KindSelector } from "../parts/KindSelector";
import { MemoInput } from "../parts/MemoInput";
import { SaveButton } from "../parts/SaveButton";
import { useManualMode } from "./useManualMode";

export function ManualMode(props: RecordingModeProps) {
  const vm = useManualMode(props);

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

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          数量 {vm.quantityUnit && `(${vm.quantityUnit})`}
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={vm.quantity}
          onChange={(e) => vm.setQuantity(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="0"
          step="any"
          autoFocus
        />
      </div>

      <MemoInput value={vm.memo} onChange={vm.setMemo} />
      <SaveButton type="submit" disabled={vm.isSubmitting} />
    </form>
  );
}
