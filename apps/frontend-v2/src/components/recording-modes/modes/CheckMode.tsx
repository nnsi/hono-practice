import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { Check } from "lucide-react";

import { useCheckMode } from "./useCheckMode";

export function CheckMode(props: RecordingModeProps) {
  const vm = useCheckMode(props);

  return (
    <div className="flex flex-col items-center space-y-4 py-4">
      <button
        type="button"
        onClick={vm.check}
        disabled={vm.isSubmitting}
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
          vm.isCheckedToday
            ? "bg-green-500 text-white"
            : "bg-white border-2 border-gray-300 text-gray-400"
        }`}
      >
        <Check size={48} />
      </button>

      <p className="text-sm text-gray-500">
        {vm.isCheckedToday ? "記録済み ✓" : "タップして記録"}
      </p>
    </div>
  );
}
