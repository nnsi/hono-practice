import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { ClipboardPaste } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { KindSelector } from "../parts/KindSelector";
import { MemoInput } from "../parts/MemoInput";
import { SaveButton } from "../parts/SaveButton";
import { useNumpadMode } from "./useNumpadMode";

const NUMPAD_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["C", "0", "backspace"],
] as const;

function keyLabel(key: string): string {
  if (key === "backspace") return "\u232b";
  return key;
}

function keyStyle(key: string): string {
  if (key === "C") return "bg-red-100";
  if (key === "backspace") return "bg-gray-200";
  return "bg-gray-100";
}

function keyTextStyle(key: string): string {
  if (key === "C") return "text-red-600 text-xl font-medium";
  return "text-xl font-medium text-gray-800";
}

async function readClipboard(): Promise<string | null> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
      return await navigator.clipboard.readText();
    }
    return null;
  } catch {
    return null;
  }
}

export function NumpadMode(props: RecordingModeProps) {
  const vm = useNumpadMode(props);

  const handlePaste = async () => {
    const text = await readClipboard();
    if (text) vm.pasteFromClipboard(text);
  };

  return (
    <View className="gap-4">
      {vm.kinds.length > 0 && (
        <KindSelector
          kinds={vm.kinds}
          selectedKindId={vm.selectedKindId}
          onSelect={vm.setSelectedKindId}
        />
      )}

      <View className="flex-row items-center px-2 py-3">
        <TouchableOpacity onPress={handlePaste} className="p-2">
          <ClipboardPaste size={20} color="#9ca3af" />
        </TouchableOpacity>
        <View className="flex-1 items-end">
          <Text className="text-4xl font-bold text-gray-900">
            {vm.formattedDisplay}
            {vm.quantityUnit ? (
              <Text className="text-lg text-gray-500"> {vm.quantityUnit}</Text>
            ) : null}
          </Text>
        </View>
      </View>

      <View className="gap-2">
        {NUMPAD_ROWS.map((row) => (
          <View key={row.join("")} className="flex-row gap-2">
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                className={`flex-1 py-4 rounded-lg items-center ${keyStyle(key)}`}
                onPress={() => vm.pressKey(key)}
              >
                <Text className={keyTextStyle(key)}>{keyLabel(key)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <MemoInput value={vm.memo} onChangeText={vm.setMemo} />
      <SaveButton onPress={vm.submit} disabled={vm.isSubmitting} />
    </View>
  );
}
