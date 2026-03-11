import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { Text, TouchableOpacity, View } from "react-native";

import { KindSelector } from "../parts/KindSelector";
import { MemoInput } from "../parts/MemoInput";
import { SaveButton } from "../parts/SaveButton";
import { useCounterMode } from "./useCounterMode";

export function CounterMode(props: RecordingModeProps) {
  const vm = useCounterMode(props);

  return (
    <View className="gap-4">
      {vm.kinds.length > 0 && (
        <KindSelector
          kinds={vm.kinds}
          selectedKindId={vm.selectedKindId}
          onSelect={vm.setSelectedKindId}
        />
      )}

      <View className="items-center py-4">
        <Text className="text-5xl font-bold">{vm.count}</Text>
        {vm.quantityUnit ? (
          <Text className="text-sm text-gray-500 mt-1">{vm.quantityUnit}</Text>
        ) : null}
      </View>

      <View className="gap-2">
        {vm.steps.map((step) => (
          <View key={step} className="flex-row justify-center gap-3">
            <TouchableOpacity
              className={`flex-1 py-3 rounded-lg items-center ${
                vm.count < step ? "bg-gray-200" : "bg-gray-300"
              }`}
              onPress={() => vm.decrement(step)}
              disabled={vm.count < step}
            >
              <Text
                className={`text-lg font-medium ${
                  vm.count < step ? "text-gray-400" : "text-gray-700"
                }`}
              >
                -{step}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 rounded-lg items-center bg-blue-500"
              onPress={() => vm.increment(step)}
            >
              <Text className="text-lg font-medium text-white">+{step}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {vm.count > 0 && (
        <TouchableOpacity className="items-center py-1" onPress={vm.reset}>
          <Text className="text-sm text-gray-500 underline">リセット</Text>
        </TouchableOpacity>
      )}

      <MemoInput value={vm.memo} onChangeText={vm.setMemo} />
      <SaveButton onPress={vm.submit} disabled={vm.isSubmitting} />
    </View>
  );
}
