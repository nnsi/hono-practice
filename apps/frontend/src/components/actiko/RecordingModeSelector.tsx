import { useState } from "react";

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
} from "lucide-react";

type RecordingModeSelectorProps = {
  recordingMode: RecordingMode;
  onRecordingModeChange: (mode: RecordingMode) => void;
  recordingModeConfig: string | null;
  onRecordingModeConfigChange: (config: string | null) => void;
};

const VISIBLE_MODES = [
  { value: "manual", label: "手動入力", icon: Pencil },
  { value: "timer", label: "タイマー", icon: Timer },
  { value: "counter", label: "カウンター", icon: Hash },
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

  const handleModeChange = (mode: RecordingMode) => {
    onRecordingModeChange(mode);
    const config = defaultRecordingModeConfig(mode);
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
    <div>
      <div className="text-sm font-medium text-gray-600 mb-2">記録モード</div>
      <div className="flex gap-2 flex-wrap">
        {VISIBLE_MODES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleModeChange(value)}
            className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
              recordingMode === value
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {recordingMode === "counter" && (
        <div className="mt-3">
          <label className="block text-sm text-gray-500 mb-1">
            ステップ値（カンマ区切り）
          </label>
          <input
            type="text"
            value={stepsText}
            onChange={(e) => handleStepsTextChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1, 10, 100"
          />
        </div>
      )}
    </div>
  );
}
