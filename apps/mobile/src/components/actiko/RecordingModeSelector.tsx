import { useRef, useState } from "react";

import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import {
  defaultRecordingModeConfig,
  parseRecordingModeConfig,
  serializeRecordingModeConfig,
} from "@packages/domain/activity/recordingModeConfig";
import { useTranslation } from "@packages/i18n";
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
  { value: "manual", labelKey: "modeManual" as const, icon: Pencil },
  { value: "timer", labelKey: "modeTimer" as const, icon: Timer },
  { value: "counter", labelKey: "modeCounter" as const, icon: Hash },
  { value: "binary", labelKey: "modeBinary" as const, icon: ToggleLeft },
  { value: "numpad", labelKey: "modeNumpad" as const, icon: Calculator },
  { value: "check", labelKey: "modeCheck" as const, icon: CheckSquare },
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
  const { t } = useTranslation("actiko");
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
      <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        {t("recordingMode")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {VISIBLE_MODES.map(({ value, labelKey, icon: Icon }) => (
          <TouchableOpacity
            key={value}
            onPress={() => handleModeChange(value)}
            className={`flex-1 min-w-[80px] items-center gap-1 px-3 py-2 rounded-lg border ${
              recordingMode === value
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600"
            }`}
            accessibilityRole="button"
            accessibilityState={{ selected: recordingMode === value }}
            accessibilityLabel={t(labelKey)}
          >
            <Icon
              size={18}
              color={recordingMode === value ? "#1d4ed8" : "#4b5563"}
            />
            <Text
              className={`text-sm ${
                recordingMode === value
                  ? "text-blue-700"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {t(labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {recordingMode === "counter" && (
        <View className="mt-3">
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t("stepValues")}
          </Text>
          <IMESafeTextInput
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base"
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
