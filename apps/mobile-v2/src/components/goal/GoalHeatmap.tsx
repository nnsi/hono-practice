import type { HeatmapSlot } from "@packages/frontend-shared/hooks/useGoalHeatmap";
import { ActivityIndicator, Text, View } from "react-native";

import { useGoalHeatmap } from "./useGoalHeatmap";

function slotBgColor(slot: HeatmapSlot): string {
  if (!slot.cell || slot.cell.totalGoals === 0) return "bg-gray-100";
  const { achievedCount, activeCount, totalGoals } = slot.cell;
  if (achievedCount === totalGoals) return "bg-green-500";
  if (achievedCount > 0) {
    const ratio = achievedCount / totalGoals;
    if (ratio >= 0.66) return "bg-green-400";
    return "bg-green-300";
  }
  if (activeCount > 0) return "bg-yellow-300";
  return "bg-gray-200";
}

export function GoalHeatmap() {
  const { grid, isLoading } = useGoalHeatmap();

  if (isLoading) {
    return (
      <View className="bg-white rounded-xl p-3 items-center justify-center mb-3">
        <ActivityIndicator size="small" color="#9ca3af" />
      </View>
    );
  }

  return (
    <View className="bg-white rounded-xl border border-gray-100 p-3 mb-3">
      <View className="self-center">
      {/* GitHubスタイル: 行=曜日(7), 列=週(N) */}
      <View className="flex-row gap-[3px] md:gap-1">
        {/* 曜日ラベル列 */}
        <View className="gap-[3px] md:gap-1 mr-0.5">
          {grid.dayLabels.map((label, i) => (
            <View
              key={label}
              className="h-[13px] md:h-4 justify-center items-end"
            >
              {i % 2 === 0 ? (
                <Text className="text-[9px] md:text-[11px] text-gray-400 leading-none">
                  {label}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* データ列 */}
        {grid.columns.map((col) => (
          <View key={col.key} className="gap-[3px] md:gap-1">
            {col.slots.map((slot) => (
              <View
                key={slot.key}
                className={`w-[13px] h-[13px] md:w-4 md:h-4 rounded-[2px] ${slotBgColor(slot)} ${
                  slot.isToday ? "border border-gray-900" : ""
                }`}
              />
            ))}
          </View>
        ))}
      </View>

      {/* 日付範囲ラベル + 凡例 */}
      <View className="flex-row items-center justify-between mt-1.5 md:mt-2">
        <Text className="text-[9px] md:text-[11px] text-gray-400">
          {grid.startLabel} — {grid.endLabel}
        </Text>
        <View className="flex-row items-center gap-0.5 md:gap-1">
          <View className="w-[9px] h-[9px] md:w-3 md:h-3 rounded-[2px] bg-gray-200" />
          <View className="w-[9px] h-[9px] md:w-3 md:h-3 rounded-[2px] bg-yellow-300" />
          <View className="w-[9px] h-[9px] md:w-3 md:h-3 rounded-[2px] bg-green-300" />
          <View className="w-[9px] h-[9px] md:w-3 md:h-3 rounded-[2px] bg-green-500" />
          <Text className="text-[9px] md:text-[11px] text-gray-400 ml-0.5">達成</Text>
        </View>
      </View>
    </View>
    </View>
  );
}
