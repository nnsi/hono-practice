export { buildDayTargets } from "@packages/domain/goal/dayTargets";

import { Switch, Text, TextInput, View } from "react-native";

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;
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
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-gray-600">曜日別に設定</Text>
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
                  className={`text-[10px] font-medium ${
                    i === 6
                      ? "text-red-500"
                      : i === 5
                        ? "text-blue-500"
                        : "text-gray-500"
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
                      ? "border-gray-200 bg-gray-50 text-gray-400"
                      : "border-gray-300 bg-white"
                  }`}
                  selectTextOnFocus
                />
                {isRest && (
                  <Text className="text-[9px] text-gray-400">休み</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
