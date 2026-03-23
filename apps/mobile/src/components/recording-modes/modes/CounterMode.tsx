import { useRef } from "react";

import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { Text, type TextInput, TouchableOpacity, View } from "react-native";

import { IMESafeTextInput } from "../../common/IMESafeTextInput";

const tabShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 1,
  elevation: 1,
};

import { KindSelector } from "../parts/KindSelector";
import { MemoInput } from "../parts/MemoInput";
import { SaveButton } from "../parts/SaveButton";
import { useCounterMode } from "./useCounterMode";

export function CounterMode(props: RecordingModeProps) {
  const vm = useCounterMode(props);

  return (
    <View>
      {/* タブ切り替え */}
      <View className="flex-row mb-4 bg-gray-100 rounded-lg p-1">
        <TouchableOpacity
          onPress={() => vm.setActiveTab("manual")}
          className={`flex-1 py-2 rounded-md items-center ${
            vm.activeTab === "manual" ? "bg-white" : ""
          }`}
          style={vm.activeTab === "manual" ? tabShadow : undefined}
        >
          <Text
            className={`text-sm font-medium ${
              vm.activeTab === "manual" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            手動入力
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => vm.setActiveTab("counter")}
          className={`flex-1 py-2 rounded-md items-center ${
            vm.activeTab === "counter" ? "bg-white" : ""
          }`}
          style={vm.activeTab === "counter" ? tabShadow : undefined}
        >
          <Text
            className={`text-sm font-medium ${
              vm.activeTab === "counter" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            カウンター
          </Text>
        </TouchableOpacity>
      </View>

      {vm.activeTab === "counter" ? (
        <CounterPanel vm={vm} />
      ) : (
        <ManualPanel vm={vm} />
      )}
    </View>
  );
}

function CounterPanel({ vm }: { vm: ReturnType<typeof useCounterMode> }) {
  return (
    <View className="gap-4">
      {vm.todayTotal > 0 && (
        <Text className="text-center text-sm text-gray-500">
          今日の合計:{" "}
          <Text className="font-semibold text-gray-900">
            {vm.todayTotal} {vm.quantityUnit}
          </Text>
        </Text>
      )}

      {vm.kinds.length > 0 && (
        <KindSelector
          kinds={vm.kinds}
          selectedKindId={vm.selectedKindId}
          onSelect={vm.setSelectedKindId}
        />
      )}

      <View className="flex-row gap-2">
        {vm.steps.map((step) => (
          <TouchableOpacity
            key={step}
            onPress={() => vm.recordStep(step)}
            disabled={vm.isSubmitting}
            className={`flex-1 py-3 rounded-lg items-center ${
              vm.isSubmitting ? "bg-blue-300" : "bg-blue-500"
            }`}
          >
            <Text className="text-lg font-medium text-white">+{step}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ManualPanel({ vm }: { vm: ReturnType<typeof useCounterMode> }) {
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
        <IMESafeTextInput
          ref={quantityRef}
          className="border border-gray-300 rounded-lg px-3 text-base"
          value={vm.quantity}
          onChangeText={vm.setQuantity}
          keyboardType="decimal-pad"
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
      <SaveButton onPress={vm.submitManual} disabled={vm.isSubmitting} />
    </View>
  );
}
