import { useRef } from "react";

import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { KindSelector } from "../parts/KindSelector";
import { MemoInput } from "../parts/MemoInput";
import { SaveButton } from "../parts/SaveButton";
import { useTimerMode } from "./useTimerMode";

export function TimerMode(props: RecordingModeProps) {
  const vm = useTimerMode(props);

  return (
    <View>
      {/* タブ切り替え */}
      <View className="flex-row mb-4 bg-gray-100 rounded-lg p-1">
        <TouchableOpacity
          onPress={() => vm.setActiveTab("manual")}
          className={`flex-1 py-2 rounded-md items-center ${
            vm.effectiveTab === "manual" ? "bg-white shadow-sm" : ""
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              vm.effectiveTab === "manual" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            手動入力
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => vm.setActiveTab("timer")}
          className={`flex-1 py-2 rounded-md items-center ${
            vm.effectiveTab === "timer" ? "bg-white shadow-sm" : ""
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              vm.effectiveTab === "timer" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            タイマー
          </Text>
        </TouchableOpacity>
      </View>

      {vm.effectiveTab === "timer" ? (
        <TimerPanel vm={vm} />
      ) : (
        <ManualPanel vm={vm} />
      )}
    </View>
  );
}

function TimerPanel({ vm }: { vm: ReturnType<typeof useTimerMode> }) {
  return (
    <View className="gap-5">
      <View className="items-center py-4">
        <Text
          className="text-5xl font-bold"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {vm.formattedTime}
        </Text>
        {vm.isRunning && (
          <Text className="text-sm text-gray-400 mt-2">計測中...</Text>
        )}
      </View>

      <View className="flex-row gap-3 justify-center">
        {vm.isRunning ? (
          <TouchableOpacity
            onPress={vm.stop}
            className="flex-row items-center gap-2 px-6 py-3 bg-red-500 rounded-xl"
          >
            <Text className="text-white font-medium">停止</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={vm.start}
            className="flex-row items-center gap-2 px-6 py-3 bg-gray-900 rounded-xl"
          >
            <Text className="text-white font-medium">
              {vm.elapsedTime > 0 ? "再開" : "開始"}
            </Text>
          </TouchableOpacity>
        )}
        {vm.isStopped && (
          <TouchableOpacity
            onPress={vm.reset}
            className="flex-row items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl"
          >
            <Text className="text-gray-600 font-medium">リセット</Text>
          </TouchableOpacity>
        )}
      </View>

      {vm.isStopped && (
        <View className="gap-4 pt-2 border-t border-gray-100">
          <Text className="text-center text-sm text-gray-500">
            記録時間:{" "}
            <Text className="font-semibold text-gray-900">
              {vm.convertedQuantity} {vm.quantityUnit}
            </Text>
          </Text>
          {vm.kinds.length > 0 && (
            <KindSelector
              kinds={vm.kinds}
              selectedKindId={vm.selectedKindId}
              onSelect={vm.setSelectedKindId}
            />
          )}
          <SaveButton onPress={vm.submitTimer} disabled={vm.isSubmitting} />
        </View>
      )}
    </View>
  );
}

function ManualPanel({ vm }: { vm: ReturnType<typeof useTimerMode> }) {
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
          className="border border-gray-300 rounded-lg px-3 py-2 text-lg"
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
