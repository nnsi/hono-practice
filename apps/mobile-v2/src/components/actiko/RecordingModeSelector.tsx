import { useState } from "react";

import {
  defaultRecordingModeConfig,
  parseRecordingModeConfig,
  serializeRecordingModeConfig,
} from "@packages/domain/activity/recordingModeConfig";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

type RecordingModeSelectorProps = {
  recordingMode: string;
  onRecordingModeChange: (mode: string) => void;
  recordingModeConfig: string | null;
  onRecordingModeConfigChange: (config: string | null) => void;
};

const VISIBLE_MODES = [
  { value: "manual", label: "手動入力" },
  { value: "timer", label: "タイマー" },
  { value: "counter", label: "カウンター" },
] as const;

function stepsFromConfig(config: string | null): number[] {
  const parsed = parseRecordingModeConfig(config);
  return parsed?.mode === "counter" ? parsed.steps : [1, 10, 100];
}

export function RecordingModeSelector({
  recordingMode,
  onRecordingModeChange,
  recordingModeConfig,
  onRecordingModeConfigChange,
}: RecordingModeSelectorProps) {
  const [stepsText, setStepsText] = useState(() =>
    stepsFromConfig(recordingModeConfig).join(", "),
  );

  const handleModeChange = (mode: string) => {
    onRecordingModeChange(mode);
    const config = defaultRecordingModeConfig(
      mode as Parameters<typeof defaultRecordingModeConfig>[0],
    );
    const serialized = serializeRecordingModeConfig(config);
    onRecordingModeConfigChange(serialized);
    if (mode === "counter") {
      setStepsText(stepsFromConfig(serialized).join(", "));
    }
  };

  const handleStepsTextChange = (value: string) => {
    setStepsText(value);
    const parsed = value
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (parsed.length === 0) return;
    onRecordingModeConfigChange(
      serializeRecordingModeConfig({ mode: "counter", steps: parsed }),
    );
  };

  return (
    <View>
      <Text className="text-sm font-medium text-gray-600 mb-2">記録モード</Text>
      <View className="flex-row gap-2">
        {VISIBLE_MODES.map(({ value, label }) => (
          <TouchableOpacity
            key={value}
            onPress={() => handleModeChange(value)}
            className={`flex-1 items-center py-2 rounded-lg border ${
              recordingMode === value
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300"
            }`}
          >
            <Text
              className={`text-sm ${
                recordingMode === value ? "text-blue-700" : "text-gray-600"
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {recordingMode === "counter" && (
        <View className="mt-3">
          <Text className="text-sm text-gray-500 mb-1">
            ステップ値（カンマ区切り）
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={stepsText}
            onChangeText={handleStepsTextChange}
            placeholder="1, 10, 100"
            keyboardType="numeric"
          />
        </View>
      )}
    </View>
  );
}
