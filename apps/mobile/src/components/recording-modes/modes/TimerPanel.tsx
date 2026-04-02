import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity, View } from "react-native";

import { FormButton } from "../../common/FormButton";
import { KindSelector } from "../parts/KindSelector";
import type { useTimerMode } from "./useTimerMode";

export function TimerPanel({ vm }: { vm: ReturnType<typeof useTimerMode> }) {
  const { t } = useTranslation("recording");

  return (
    <View className="gap-5">
      <View className="items-center py-4">
        <Text
          className="text-5xl font-bold"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {vm.formattedTime}
        </Text>
        {vm.isRunning && (
          <Text className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            {t("measuring")}
          </Text>
        )}
      </View>

      <View className="flex-row gap-3 justify-center">
        {vm.isRunning ? (
          <TouchableOpacity
            onPress={vm.stop}
            className="flex-row items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/200 rounded-xl"
            accessibilityRole="button"
            accessibilityLabel={t("stop")}
          >
            <Text className="text-white font-medium">{t("stop")}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={vm.start}
            className="flex-row items-center gap-2 px-6 py-3 bg-gray-900 rounded-xl"
            accessibilityRole="button"
            accessibilityLabel={vm.elapsedTime > 0 ? t("resume") : t("start")}
          >
            <Text className="text-white font-medium">
              {vm.elapsedTime > 0 ? t("resume") : t("start")}
            </Text>
          </TouchableOpacity>
        )}
        {vm.isStopped && (
          <TouchableOpacity
            onPress={vm.reset}
            className="flex-row items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl"
            accessibilityRole="button"
            accessibilityLabel={t("reset")}
          >
            <Text className="text-gray-600 dark:text-gray-400 font-medium">
              {t("reset")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {vm.isStopped && (
        <View className="gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t("elapsedTime")}{" "}
            <Text className="font-semibold text-gray-900 dark:text-gray-100">
              {vm.convertedQuantity} {vm.quantityUnit}
            </Text>
          </Text>
          {vm.kinds.length > 0 && (
            <KindSelector
              kinds={vm.kinds}
              selectedKindId={vm.selectedKindId}
              onSelect={vm.setSelectedKindId}
            />
          )}
          <FormButton
            variant="primary"
            label={t("save")}
            onPress={vm.submitTimer}
            disabled={vm.isSubmitting}
          />
        </View>
      )}
    </View>
  );
}
