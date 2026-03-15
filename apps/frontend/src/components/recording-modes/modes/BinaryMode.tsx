import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";

import { useBinaryMode } from "./useBinaryMode";

const KIND_COLORS = [
  "bg-blue-500 hover:bg-blue-600",
  "bg-gray-700 hover:bg-gray-800",
  "bg-emerald-500 hover:bg-emerald-600",
  "bg-orange-500 hover:bg-orange-600",
];

export function BinaryMode(props: RecordingModeProps) {
  const vm = useBinaryMode(props);

  if (!vm.hasKinds) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        バイナリモードを使うには、アクティビティに「種類」を追加してください。
      </div>
    );
  }

  const totalCount = vm.kindTallies.reduce((sum, k) => sum + k.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {vm.kindTallies.map((kind, i) => (
          <button
            key={kind.id}
            type="button"
            onClick={() => vm.selectKind(kind.id)}
            disabled={vm.isSubmitting}
            className={`flex-1 py-8 text-xl font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${KIND_COLORS[i % KIND_COLORS.length]}`}
          >
            {kind.name}
          </button>
        ))}
      </div>

      {totalCount > 0 && (
        <div className="text-center text-sm text-gray-500">
          今日: {vm.kindTallies.map((k) => `${k.count}${k.name}`).join(" ")}
        </div>
      )}
    </div>
  );
}
