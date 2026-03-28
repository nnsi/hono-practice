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
import { useTimerMode } from "./useTimerMode";

export function TimerMode(props: RecordingModeProps) {
  const { t } = useTranslation("recording");
  const vm = useTimerMode(props);

  return (
    <View>
      {/* タブ切り替え */}
      <View className="flex-row mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <TouchableOpacity
          onPress={() => vm.setActiveTab("manual")}
          className={`flex-1 py-2 rounded-md items-center ${
            vm.effectiveTab === "manual" ? "bg-white dark:bg-gray-800" : ""
          }`}
          style={vm.effectiveTab === "manual" ? tabShadow : undefined}
        >
          <Text
            className={`text-sm font-medium ${
              vm.effectiveTab === "manual"
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t("manualEntry")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => vm.setActiveTab("timer")}
          className={`flex-1 py-2 rounded-md items-center ${
            vm.effectiveTab === "timer" ? "bg-white dark:bg-gray-800" : ""
          }`}
          style={vm.effectiveTab === "timer" ? tabShadow : undefined}
        >
          <Text
            className={`text-sm font-medium ${
              vm.effectiveTab === "timer"
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t("timer")}
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
  const { t } = useTranslation("recording");
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
          <Text className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            {t("measuring")}
          </Text>
        )}
      </View>

      <View className="flex-row gap-3 justify-center">
        {vm.isRunning ? (
          <TouchableOpacity
            onPress={vm.stop}
            className="flex-row items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/200 rounded-xl"
          >
            <Text className="text-white font-medium">{t("stop")}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={vm.start}
            className="flex-row items-center gap-2 px-6 py-3 bg-gray-900 rounded-xl"
          >
            <Text className="text-white font-medium">
              {vm.elapsedTime > 0 ? t("resume") : t("start")}
            </Text>
          </TouchableOpacity>
        )}
        {vm.isStopped && (
          <TouchableOpacity
            onPress={vm.reset}
            className="flex-row items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl"
          >
            <Text className="text-gray-600 dark:text-gray-400 font-medium">
              {t("reset")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {vm.isStopped && (
        <View className="gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t("elapsedTime")}{" "}
            <Text className="font-semibold text-gray-900 dark:text-gray-100">
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
