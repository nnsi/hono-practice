import { useRef } from "react";

import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { useTranslation } from "@packages/i18n";
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
  const { t } = useTranslation("recording");
  const vm = useCounterMode(props);

  return (
    <View>
      {/* タブ切り替え */}
      <View className="flex-row mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <TouchableOpacity
          onPress={() => vm.setActiveTab("manual")}
          className={`flex-1 py-2 rounded-md items-center ${
            vm.activeTab === "manual" ? "bg-white dark:bg-gray-800" : ""
          }`}
          style={vm.activeTab === "manual" ? tabShadow : undefined}
        >
          <Text
            className={`text-sm font-medium ${
              vm.activeTab === "manual" ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t("manualEntry")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => vm.setActiveTab("counter")}
          className={`flex-1 py-2 rounded-md items-center ${
            vm.activeTab === "counter" ? "bg-white dark:bg-gray-800" : ""
          }`}
          style={vm.activeTab === "counter" ? tabShadow : undefined}
        >
          <Text
            className={`text-sm font-medium ${
              vm.activeTab === "counter" ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t("counter")}
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
  const { t } = useTranslation("recording");
  return (
    <View className="gap-4">
      {vm.todayTotal > 0 && (
        <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
          {t("todayTotal")}{" "}
          <Text className="font-semibold text-gray-900 dark:text-gray-100">
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
              vm.isSubmitting ? "bg-blue-300" : "bg-blue-50 dark:bg-blue-900/200"
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
  const { t } = useTranslation("recording");
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
        <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          {t("quantity")}
          {vm.quantityUnit ? ` (${vm.quantityUnit})` : ""}
        </Text>
        <IMESafeTextInput
          ref={quantityRef}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 text-base"
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
