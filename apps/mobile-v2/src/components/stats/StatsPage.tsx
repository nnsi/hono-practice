import { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogs } from "../../hooks/useActivityLogs";
import { SummarySection } from "./SummarySection";

dayjs.extend(isoWeek);

export function StatsPage() {
  const { activities } = useActivities();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null
  );

  const today = dayjs().format("YYYY-MM-DD");
  const { logs: todayLogs } = useActivityLogs(today);

  // Generate dates for the last 7 days
  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      days.push(dayjs().subtract(i, "day").format("YYYY-MM-DD"));
    }
    return days;
  }, []);

  // We need logs for each of the last 7 days individually
  // Since useActivityLogs works per-date, we get today's logs
  // and compute stats from them
  const { logs: day1Logs } = useActivityLogs(last7Days[0]);
  const { logs: day2Logs } = useActivityLogs(last7Days[1]);
  const { logs: day3Logs } = useActivityLogs(last7Days[2]);
  const { logs: day4Logs } = useActivityLogs(last7Days[3]);
  const { logs: day5Logs } = useActivityLogs(last7Days[4]);
  const { logs: day6Logs } = useActivityLogs(last7Days[5]);
  const { logs: day7Logs } = useActivityLogs(last7Days[6]);

  const allWeekLogs = useMemo(
    () => [day1Logs, day2Logs, day3Logs, day4Logs, day5Logs, day6Logs, day7Logs],
    [day1Logs, day2Logs, day3Logs, day4Logs, day5Logs, day6Logs, day7Logs]
  );

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === selectedActivityId),
    [activities, selectedActivityId]
  );

  const filterLogs = (
    logs: typeof todayLogs
  ) => {
    if (!selectedActivityId) return logs;
    return logs.filter((l) => l.activityId === selectedActivityId);
  };

  const sumQuantity = (logs: typeof todayLogs) => {
    const filtered = filterLogs(logs);
    if (selectedActivity?.quantityUnit) {
      return filtered.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
    }
    return filtered.length;
  };

  const todayTotal = sumQuantity(todayLogs);

  const weekTotal = useMemo(() => {
    return allWeekLogs.reduce((sum, dayLogs) => sum + sumQuantity(dayLogs), 0);
  }, [allWeekLogs, selectedActivityId]);

  // Month total: sum all 7 day logs that fall in current month
  const currentMonth = dayjs().format("YYYY-MM");
  const monthTotal = useMemo(() => {
    return allWeekLogs.reduce((sum, dayLogs, i) => {
      if (last7Days[i].startsWith(currentMonth)) {
        return sum + sumQuantity(dayLogs);
      }
      return sum;
    }, 0);
  }, [allWeekLogs, selectedActivityId, currentMonth]);

  // Daily chart data
  const chartData = useMemo(() => {
    return allWeekLogs.map((dayLogs, i) => ({
      date: last7Days[i],
      label: dayjs(last7Days[i]).format("dd"),
      value: sumQuantity(dayLogs),
    }));
  }, [allWeekLogs, selectedActivityId]);

  const maxChartValue = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Activity selector */}
      <View className="px-4 pt-3 pb-2">
        <Text className="text-sm text-gray-500 mb-2">アクティビティ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setSelectedActivityId(null)}
            className={`px-3 py-1.5 rounded-full mr-2 border ${
              selectedActivityId === null
                ? "bg-blue-500 border-blue-500"
                : "bg-white border-gray-300"
            }`}
          >
            <Text
              className={`text-sm ${
                selectedActivityId === null
                  ? "text-white font-medium"
                  : "text-gray-700"
              }`}
            >
              すべて
            </Text>
          </TouchableOpacity>
          {activities.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => setSelectedActivityId(a.id)}
              className={`px-3 py-1.5 rounded-full mr-2 border ${
                selectedActivityId === a.id
                  ? "bg-blue-500 border-blue-500"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-sm ${
                  selectedActivityId === a.id
                    ? "text-white font-medium"
                    : "text-gray-700"
                }`}
              >
                {a.emoji} {a.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary */}
      <SummarySection
        todayTotal={todayTotal}
        weekTotal={weekTotal}
        monthTotal={monthTotal}
        unit={selectedActivity?.quantityUnit || ""}
      />

      {/* Bar chart - last 7 days */}
      <View className="mx-4 p-4 bg-white rounded-xl border border-gray-200 mb-4">
        <Text className="text-sm font-medium text-gray-600 mb-3">
          直近7日間
        </Text>
        <View className="flex-row items-end justify-between" style={{ height: 120 }}>
          {chartData.map((d) => (
            <View key={d.date} className="flex-1 items-center">
              <Text className="text-xs text-gray-500 mb-1">{d.value}</Text>
              <View
                className="w-6 bg-blue-500 rounded-t"
                style={{
                  height: Math.max((d.value / maxChartValue) * 80, 2),
                }}
              />
              <Text className="text-xs text-gray-400 mt-1">{d.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Spacer */}
      <View className="h-20" />
    </ScrollView>
  );
}
