import { useRef } from "react";

import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { Text, TextInput, View } from "react-native";

import { KindSelector } from "../parts/KindSelector";
import { MemoInput } from "../parts/MemoInput";
import { SaveButton } from "../parts/SaveButton";
import { useManualMode } from "./useManualMode";

export function ManualMode(props: RecordingModeProps) {
  const vm = useManualMode(props);
  const quantityRef = useRef<TextInput>(null);

  return (
    <View className="gap-4">
      {vm.kinds.length > 0 && (
        <KindSelector
          kinds={vm.kinds}
          selectedKindId={vm.selectedKindId}
          onSelect={vm.setSelectedKindId}
        />
      )}

      <View>
        <Text className="text-sm font-medium text-gray-600 mb-1">
          数量{vm.quantityUnit ? ` (${vm.quantityUnit})` : ""}
        </Text>
        <TextInput
          ref={quantityRef}
          style={{ includeFontPadding: false }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-lg"
          value={vm.quantity}
          onChangeText={vm.setQuantity}
          keyboardType="decimal-pad"
          autoFocus
          onFocus={() => {
            setTimeout(() => {
              const node = quantityRef.current as unknown as {
                select?: () => void;
                setSelection?: (start: number, end: number) => void;
              } | null;
              if (node?.select) {
                node.select();
              } else if (node?.setSelection) {
                node.setSelection(0, vm.quantity.length);
              }
            }, 0);
          }}
        />
      </View>

      <MemoInput value={vm.memo} onChangeText={vm.setMemo} />
      <SaveButton onPress={vm.submit} disabled={vm.isSubmitting} />
    </View>
  );
}
