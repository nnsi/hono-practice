import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { useTranslation } from "@packages/i18n";
import { Check } from "lucide-react";

import { useCheckMode } from "./useCheckMode";

export function CheckMode(props: RecordingModeProps) {
  const { t } = useTranslation("recording");
  const vm = useCheckMode(props);

  return (
    <div className="flex flex-col items-center space-y-4 py-4">
      {vm.hasKinds && (
        <div className="flex flex-wrap gap-2 justify-center">
          {vm.kindItems.map((kind) => (
            <button
              key={kind.id}
              type="button"
              onClick={() => vm.selectKind(kind.id)}
              disabled={kind.isCheckedToday || vm.isSubmitting}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                kind.isCheckedToday
                  ? "bg-gray-100 text-gray-400"
                  : vm.selectedKindId === kind.id
                    ? "bg-blue-500 text-white"
                    : "bg-white border border-gray-300 text-gray-700"
              }`}
            >
              {kind.name}
              {kind.isCheckedToday && (
                <Check size={14} className="text-green-500" />
              )}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={vm.check}
        disabled={!vm.canCheck || vm.isSubmitting}
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
          !vm.hasKinds && vm.isCheckedToday
            ? "bg-green-500 text-white"
            : vm.canCheck
              ? "bg-white border-2 border-blue-500 text-blue-500"
              : "bg-white border-2 border-gray-300 text-gray-400"
        }`}
      >
        <Check size={48} />
      </button>

      <p className="text-sm text-gray-500">
        {!vm.hasKinds && vm.isCheckedToday
          ? t("recorded")
          : vm.hasKinds && !vm.selectedKindId
            ? t("selectItem")
            : vm.canCheck
              ? t("tapToRecord")
              : vm.hasKinds
                ? t("recorded")
                : t("tapToRecord")}
      </p>
    </div>
  );
}
