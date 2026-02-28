import { useRef } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import {
  convertSecondsToUnit,
  formatElapsedTime,
} from "@packages/domain/time/timeUtils";
import { useLogForm } from "./useLogForm";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
};

export function LogFormBody({
  activity,
  date,
  onDone,
}: {
  activity: Activity;
  date: string;
  onDone: () => void;
}) {
  const quantityRef = useRef<TextInput>(null);

  const {
    timerEnabled,
    effectiveTab,
    setActiveTab,
    quantity,
    setQuantity,
    memo,
    setMemo,
    selectedKindId,
    setSelectedKindId,
    isSubmitting,
    kinds,
    timer,
    timeUnitType,
    handleManualSubmit,
    handleTimerSave,
  } = useLogForm(activity, date, onDone);

  return (
    <View>
      {/* Tab switcher */}
      {timerEnabled && (
        <View className="flex-row mb-4 bg-gray-100 rounded-lg p-1">
          <TouchableOpacity
            onPress={() => setActiveTab("manual")}
            className={`flex-1 py-2 rounded-md items-center ${
              effectiveTab === "manual" ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                effectiveTab === "manual" ? "text-gray-900" : "text-gray-500"
              }`}
            >
              手動入力
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("timer")}
            className={`flex-1 py-2 rounded-md items-center ${
              effectiveTab === "timer" ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                effectiveTab === "timer" ? "text-gray-900" : "text-gray-500"
              }`}
            >
              タイマー
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {effectiveTab === "timer" ? (
        <TimerPanel
          timer={timer}
          activity={activity}
          kinds={kinds}
          selectedKindId={selectedKindId}
          onSelectKind={setSelectedKindId}
          timeUnitType={timeUnitType}
          isSubmitting={isSubmitting}
          onSave={handleTimerSave}
        />
      ) : (
        <View className="gap-4">
          {kinds.length > 0 && (
            <KindSelector
              kinds={kinds}
              selectedKindId={selectedKindId}
              onSelect={setSelectedKindId}
            />
          )}

          <View>
            <Text className="text-sm font-medium text-gray-600 mb-1">
              数量{activity.quantityUnit ? ` (${activity.quantityUnit})` : ""}
            </Text>
            <TextInput
              ref={quantityRef}
              className="border border-gray-300 rounded-lg px-3 py-2 text-lg"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              onFocus={() => {
                setTimeout(() => {
                  const node = quantityRef.current as unknown as {
                    select?: () => void;
                    setSelection?: (start: number, end: number) => void;
                  } | null;
                  if (node?.select) {
                    // Web: DOM input.select()
                    node.select();
                  } else if (node?.setSelection) {
                    // Native: RN TextInput.setSelection()
                    node.setSelection(0, quantity.length);
                  }
                }, 0);
              }}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-600 mb-1">
              メモ
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={memo}
              onChangeText={setMemo}
              placeholder="メモを入力..."
              multiline
              numberOfLines={2}
            />
          </View>

          <TouchableOpacity
            className={`py-3 rounded-lg items-center mb-4 ${
              isSubmitting ? "bg-gray-400" : "bg-gray-900"
            }`}
            onPress={handleManualSubmit}
            disabled={isSubmitting}
          >
            <Text className="text-white font-medium">記録する</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// --- Timer Panel ---

function TimerPanel({
  timer,
  activity,
  kinds,
  selectedKindId,
  onSelectKind,
  timeUnitType,
  isSubmitting,
  onSave,
}: {
  timer: {
    isRunning: boolean;
    elapsedTime: number;
    start: () => void;
    stop: () => void;
    reset: () => void;
    getElapsedSeconds: () => number;
  };
  activity: Activity;
  kinds: { id: string; name: string; color: string | null }[];
  selectedKindId: string | null;
  onSelectKind: (id: string | null) => void;
  timeUnitType: import("@packages/domain/time/timeUtils").TimeUnitType;
  isSubmitting: boolean;
  onSave: () => void;
}) {
  const { isRunning, elapsedTime, start, stop, reset, getElapsedSeconds } =
    timer;
  const stopped = !isRunning && elapsedTime > 0;

  return (
    <View className="gap-5">
      <View className="items-center py-4">
        <Text className="text-5xl font-bold" style={{ fontVariant: ["tabular-nums"] }}>
          {formatElapsedTime(elapsedTime)}
        </Text>
        {isRunning && (
          <Text className="text-sm text-gray-400 mt-2">計測中...</Text>
        )}
      </View>

      <View className="flex-row gap-3 justify-center">
        {isRunning ? (
          <TouchableOpacity
            onPress={stop}
            className="flex-row items-center gap-2 px-6 py-3 bg-red-500 rounded-xl"
          >
            <Text className="text-white font-medium">停止</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={start}
            className="flex-row items-center gap-2 px-6 py-3 bg-gray-900 rounded-xl"
          >
            <Text className="text-white font-medium">
              {elapsedTime > 0 ? "再開" : "開始"}
            </Text>
          </TouchableOpacity>
        )}
        {stopped && (
          <TouchableOpacity
            onPress={reset}
            className="flex-row items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl"
          >
            <Text className="text-gray-600 font-medium">リセット</Text>
          </TouchableOpacity>
        )}
      </View>

      {stopped && (
        <View className="gap-4 pt-2 border-t border-gray-100">
          <Text className="text-center text-sm text-gray-500">
            記録時間:{" "}
            <Text className="font-semibold text-gray-900">
              {convertSecondsToUnit(getElapsedSeconds(), timeUnitType)}{" "}
              {activity.quantityUnit}
            </Text>
          </Text>

          {kinds.length > 0 && (
            <KindSelector
              kinds={kinds}
              selectedKindId={selectedKindId}
              onSelect={onSelectKind}
            />
          )}

          <TouchableOpacity
            onPress={onSave}
            disabled={isSubmitting}
            className={`py-3 rounded-lg items-center mb-4 ${
              isSubmitting ? "bg-gray-400" : "bg-gray-900"
            }`}
          >
            <Text className="text-white font-medium">
              {isSubmitting ? "記録中..." : "記録する"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// --- Kind Selector ---

export function KindSelector({
  kinds,
  selectedKindId,
  onSelect,
}: {
  kinds: { id: string; name: string; color: string | null }[];
  selectedKindId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <View>
      <Text className="text-sm font-medium text-gray-600 mb-2">種類</Text>
      <View className="flex-row flex-wrap gap-2">
        {kinds.map((kind) => (
          <TouchableOpacity
            key={kind.id}
            onPress={() =>
              onSelect(selectedKindId === kind.id ? null : kind.id)
            }
            className={`flex-row items-center px-3 py-1.5 rounded-full border ${
              selectedKindId === kind.id
                ? "bg-gray-900 border-gray-900"
                : "bg-white border-gray-300"
            }`}
          >
            {kind.color && (
              <View
                className="w-2.5 h-2.5 rounded-full mr-1.5"
                style={{ backgroundColor: kind.color }}
              />
            )}
            <Text
              className={`text-sm ${
                selectedKindId === kind.id
                  ? "text-white font-medium"
                  : "text-gray-700"
              }`}
            >
              {kind.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
