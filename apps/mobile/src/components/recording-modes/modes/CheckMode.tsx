import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { useTranslation } from "@packages/i18n";
import { Check } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { useCheckMode } from "./useCheckMode";

export function CheckMode(props: RecordingModeProps) {
  const { t } = useTranslation("recording");
  const vm = useCheckMode(props);

  const buttonColor =
    !vm.hasKinds && vm.isCheckedToday
      ? "bg-green-50 dark:bg-green-900/200"
      : vm.canCheck
        ? "bg-white dark:bg-gray-800 border-2 border-blue-500"
        : "bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600";

  const iconColor =
    !vm.hasKinds && vm.isCheckedToday
      ? "#ffffff"
      : vm.canCheck
        ? "#3b82f6"
        : "#d1d5db";

  const statusText =
    !vm.hasKinds && vm.isCheckedToday
      ? t("recorded")
      : vm.hasKinds && !vm.selectedKindId
        ? t("selectItem")
        : vm.canCheck
          ? t("tapToRecord")
          : vm.hasKinds
            ? t("recorded")
            : t("tapToRecord");

  return (
    <View className="items-center gap-4 py-4">
      {vm.hasKinds && (
        <View className="flex-row flex-wrap gap-2 justify-center">
          {vm.kindItems.map((kind) => (
            <TouchableOpacity
              key={kind.id}
              onPress={() => vm.selectKind(kind.id)}
              disabled={kind.isCheckedToday || vm.isSubmitting}
              className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full ${
                kind.isCheckedToday
                  ? "bg-gray-100 dark:bg-gray-800"
                  : vm.selectedKindId === kind.id
                    ? "bg-blue-50 dark:bg-blue-900/200"
                    : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
              }`}
              accessibilityRole="button"
              accessibilityLabel={kind.name}
              accessibilityState={{
                selected: vm.selectedKindId === kind.id,
                disabled: kind.isCheckedToday || vm.isSubmitting,
              }}
            >
              <Text
                className={`text-sm font-medium ${
                  kind.isCheckedToday
                    ? "text-gray-400 dark:text-gray-500"
                    : vm.selectedKindId === kind.id
                      ? "text-white"
                      : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {kind.name}
              </Text>
              {kind.isCheckedToday && <Check size={14} color="#22c55e" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        className={`w-24 h-24 rounded-full items-center justify-center ${buttonColor} ${
          !vm.canCheck || vm.isSubmitting ? "opacity-50" : ""
        }`}
        onPress={vm.check}
        disabled={!vm.canCheck || vm.isSubmitting}
        accessibilityRole="checkbox"
        accessibilityLabel={t("recorded")}
        accessibilityState={{
          checked: vm.isCheckedToday,
          disabled: !vm.canCheck || vm.isSubmitting,
        }}
      >
        <Check size={48} color={iconColor} />
      </TouchableOpacity>

      <Text className="text-sm text-gray-500 dark:text-gray-400">
        {statusText}
      </Text>
    </View>
  );
}
