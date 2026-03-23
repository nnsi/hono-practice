import { useRef, useState } from "react";

import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import {
  defaultRecordingModeConfig,
  parseRecordingModeConfig,
  serializeRecordingModeConfig,
} from "@packages/domain/activity/recordingModeConfig";
import {
  Calculator,
  CheckSquare,
  Hash,
  Pencil,
  Timer,
  ToggleLeft,
} from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { IMESafeTextInput } from "../common/IMESafeTextInput";

type RecordingModeSelectorProps = {
  recordingMode: RecordingMode;
  onRecordingModeChange: (mode: RecordingMode) => void;
  recordingModeConfig: string | null;
  onRecordingModeConfigChange: (config: string | null) => void;
};

const VISIBLE_MODES = [
  { value: "manual", label: "手動入力", icon: Pencil },
  { value: "timer", label: "タイマー", icon: Timer },
  { value: "counter", label: "カウンタ", icon: Hash },
  { value: "binary", label: "バイナリ", icon: ToggleLeft },
  { value: "numpad", label: "テンキー", icon: Calculator },
  { value: "check", label: "チェック", icon: CheckSquare },
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
  const savedCounterConfigRef = useRef<string | null>(recordingModeConfig);

  const handleModeChange = (mode: RecordingMode) => {
    if (recordingMode === "counter") {
      savedCounterConfigRef.current = recordingModeConfig;
    }
    onRecordingModeChange(mode);
    if (mode === "counter" && savedCounterConfigRef.current) {
      onRecordingModeConfigChange(savedCounterConfigRef.current);
      setStepsText(stepsFromConfig(savedCounterConfigRef.current).join(", "));
    } else {
      const config = defaultRecordingModeConfig(mode);
      const serialized = serializeRecordingModeConfig(config);
      onRecordingModeConfigChange(serialized);
      if (mode === "counter") {
        setStepsText(stepsFromConfig(serialized).join(", "));
      }
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
      <View className="flex-row flex-wrap gap-2">
        {VISIBLE_MODES.map(({ value, label, icon: Icon }) => (
          <TouchableOpacity
            key={value}
            onPress={() => handleModeChange(value)}
            className={`flex-1 min-w-[80px] items-center gap-1 px-3 py-2 rounded-lg border ${
              recordingMode === value
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300"
            }`}
          >
            <Icon
              size={18}
              color={recordingMode === value ? "#1d4ed8" : "#4b5563"}
            />
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
          <IMESafeTextInput
            className="border border-gray-300 rounded-lg px-3 py-2 text-base"
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
