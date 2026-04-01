import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity, View } from "react-native";

import { TimerManualPanel } from "./TimerManualPanel";
import { TimerPanel } from "./TimerPanel";
import { useTimerMode } from "./useTimerMode";

const tabShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 1,
  elevation: 1,
};

export function TimerMode(props: RecordingModeProps) {
  const { t } = useTranslation("recording");
  const vm = useTimerMode(props);

  return (
    <View>
      <View className="flex-row mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <TouchableOpacity
          onPress={() => vm.setActiveTab("manual")}
          className={`flex-1 py-2 rounded-md items-center ${
            vm.effectiveTab === "manual" ? "bg-white dark:bg-gray-800" : ""
          }`}
          style={vm.effectiveTab === "manual" ? tabShadow : undefined}
          accessibilityRole="tab"
          accessibilityLabel={t("manualEntry")}
          accessibilityState={{ selected: vm.effectiveTab === "manual" }}
        >
          <Text
            className={`text-sm font-medium ${
              vm.effectiveTab === "manual"
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t("manualEntry")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => vm.setActiveTab("timer")}
          className={`flex-1 py-2 rounded-md items-center ${
            vm.effectiveTab === "timer" ? "bg-white dark:bg-gray-800" : ""
          }`}
          style={vm.effectiveTab === "timer" ? tabShadow : undefined}
          accessibilityRole="tab"
          accessibilityLabel={t("timer")}
          accessibilityState={{ selected: vm.effectiveTab === "timer" }}
        >
          <Text
            className={`text-sm font-medium ${
              vm.effectiveTab === "timer"
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t("timer")}
          </Text>
        </TouchableOpacity>
      </View>

      {vm.effectiveTab === "timer" ? (
        <TimerPanel vm={vm} />
      ) : (
        <TimerManualPanel vm={vm} />
      )}
    </View>
  );
}
