import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import dayjs from "dayjs";
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react-native";
import { ActivityStatCard } from "./ActivityStatCard";
import { useStatsPage } from "./useStatsPage";

export function StatsPage() {
  const {
    month,
    goToPrevMonth,
    goToNextMonth,
    isLoading,
    stats,
    allDates,
    getGoalLinesForActivity,
  } = useStatsPage();

  return (
    <View className="flex-1 bg-white">
      {/* Month navigation header */}
      <View className="flex-row items-center justify-center gap-3 px-4 h-12 border-b border-gray-100 bg-white">
        <TouchableOpacity
          onPress={goToPrevMonth}
          className="p-2 rounded-xl"
          activeOpacity={0.6}
        >
          <ChevronLeft size={20} color="#6b7280" />
        </TouchableOpacity>
        <Text className="text-base font-medium text-gray-900 min-w-[100px] text-center">
          {dayjs(month).format("YYYY年M月")}
        </Text>
        <TouchableOpacity
          onPress={goToNextMonth}
          className="p-2 rounded-xl"
          activeOpacity={0.6}
        >
          <ChevronRight size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 24 }}
      >
        {isLoading ? (
          <View className="items-center py-16">
            <Text className="text-gray-400">読み込み中...</Text>
          </View>
        ) : !stats || stats.length === 0 ? (
          <View className="items-center py-16">
            <BarChart3 size={48} color="#d1d5db" />
            <Text className="text-lg text-gray-400 mt-3 mb-1">
              データがありません
            </Text>
            <Text className="text-sm text-gray-400">
              {dayjs(month).format("YYYY年M月")}
              のアクティビティ記録はありません
            </Text>
          </View>
        ) : (
          stats.map((stat) => (
            <ActivityStatCard
              key={stat.id}
              stat={stat}
              allDates={allDates}
              month={month}
              goalLines={getGoalLinesForActivity(stat.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
