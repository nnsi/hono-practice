export { buildDayTargets } from "@packages/domain/goal/dayTargets";

import { useTranslation } from "@packages/i18n";
import { Switch, Text, TextInput, View } from "react-native";

const DAY_KEYS = ["1", "2", "3", "4", "5", "6", "7"] as const;

export function DayTargetsInput({
  enabled,
  onToggle,
  values,
  onChange,
  defaultTarget,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  defaultTarget: string;
}) {
  const { t } = useTranslation("goal");
  const DAY_LABELS = [
    t("dayMon"),
    t("dayTue"),
    t("dayWed"),
    t("dayThu"),
    t("dayFri"),
    t("daySat"),
    t("daySun"),
  ] as const;

  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {t("dayTargetsLabel")}
        </Text>
        <Switch
          value={enabled}
          onValueChange={(v) => {
            onToggle(v);
            if (v && Object.keys(values).length === 0) {
              const init: Record<string, string> = {};
              for (const k of DAY_KEYS) init[k] = defaultTarget;
              onChange(init);
            }
          }}
          accessibilityLabel={t("dayTargetsLabel")}
        />
      </View>
      {enabled && (
        <View className="flex-row gap-1 mt-2">
          {DAY_KEYS.map((k, i) => {
            const val = values[k] ?? defaultTarget;
            const isRest = val === "0";
            return (
              <View key={k} className="flex-1 items-center gap-0.5">
                <Text
                  className={`text-xs font-medium ${
                    i === 6
                      ? "text-red-500 dark:text-red-400"
                      : i === 5
                        ? "text-blue-500 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {DAY_LABELS[i]}
                </Text>
                <TextInput
                  style={{ includeFontPadding: false }}
                  value={val}
                  onChangeText={(text) => onChange({ ...values, [k]: text })}
                  keyboardType="numeric"
                  className={`w-full px-1 py-1 border rounded text-xs text-center ${
                    isRest
                      ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  }`}
                  selectTextOnFocus
                  accessibilityLabel={`${DAY_LABELS[i]} ${t("dayTargetsLabel")}`}
                />
                {isRest && (
                  <Text className="text-xs text-gray-400 dark:text-gray-500">
                    {t("dayTargetRest")}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
