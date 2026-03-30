import { useMemo } from "react";

import type { ActivityRecord } from "@packages/domain/activity/activityRecord";
import {
  calculateGoalStats,
  generateDailyRecords,
} from "@packages/domain/goal/goalStats";
import { getToday } from "@packages/frontend-shared/utils/dateUtils";
import dayjs from "dayjs";
import {
  BarChart3,
  Calendar,
  Flame,
  Loader2,
  TrendingUp,
  Trophy,
} from "lucide-react-native";
import { Text, View } from "react-native";

import { getDatabase } from "../../db/database";
import { useLiveQuery } from "../../db/useLiveQuery";
import { StatCard } from "./StatCard";

type GoalForCard = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  debtCap?: number | null;
};

export function GoalStatsDetail({
  goal,
  activity,
}: {
  goal: GoalForCard;
  activity: ActivityRecord | null;
}) {
  const today = getToday();
  const endDate = goal.endDate || today;
  const actualEndDate = endDate < today ? endDate : today;

  const periodLogs = useLiveQuery(["activity_logs"], async () => {
    const db = await getDatabase();
    return db.getAllAsync<{ date: string; quantity: number | null }>(
      `SELECT date, quantity FROM activity_logs
         WHERE activity_id = ? AND date >= ? AND date <= ? AND deleted_at IS NULL`,
      [goal.activityId, goal.startDate, actualEndDate],
    );
  }, [goal.activityId, goal.startDate, actualEndDate]);

  const statsData = useMemo(() => {
    if (!periodLogs) return null;
    const dailyRecords = generateDailyRecords(goal, periodLogs, today);
    const stats = calculateGoalStats(dailyRecords);
    return { dailyRecords, stats };
  }, [periodLogs, goal, today]);

  const unit = activity?.quantityUnit ?? "";

  if (!statsData) {
    return (
      <View className="px-4 pb-4 py-6 flex-row items-center justify-center">
        <Loader2 size={16} color="#9ca3af" />
        <Text className="ml-2 text-xs text-gray-400 dark:text-gray-500">
          統計を読み込み中...
        </Text>
      </View>
    );
  }

  const totalDays = statsData.dailyRecords.length;
  const achieveRate =
    totalDays > 0 ? (statsData.stats.achievedDays / totalDays) * 100 : 0;

  return (
    <View className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
      {/* Stats grid (2 columns) */}
      <View className="flex-row flex-wrap gap-2 mt-3">
        <StatCard
          icon={<Calendar size={14} color="#6b7280" />}
          label="活動日数"
          value={`${statsData.stats.activeDays}日`}
          sub={`/ ${totalDays}日`}
        />
        <StatCard
          icon={<Trophy size={14} color="#6b7280" />}
          label="達成日数"
          value={`${statsData.stats.achievedDays}日`}
          sub={`${achieveRate.toFixed(0)}%`}
        />
        <StatCard
          icon={<Flame size={14} color="#6b7280" />}
          label="最大連続日数"
          value={`${statsData.stats.maxConsecutiveDays}日`}
        />
        <StatCard
          icon={<TrendingUp size={14} color="#6b7280" />}
          label="平均活動量"
          value={`${statsData.stats.average}${unit}`}
        />
        <StatCard
          icon={<BarChart3 size={14} color="#6b7280" />}
          label="最大活動量"
          value={`${statsData.stats.max}${unit}`}
        />
      </View>

      {/* Daily records heatmap (last 14 days) */}
      {statsData.dailyRecords.length > 0 && (
        <View className="mt-3">
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            直近の記録
          </Text>
          <View className="flex-row gap-1">
            {statsData.dailyRecords.slice(-14).map((record) => (
              <View
                key={record.date}
                className={`flex-1 h-6 rounded-sm ${
                  record.achieved
                    ? "bg-green-400"
                    : record.quantity > 0
                      ? "bg-yellow-300"
                      : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </View>
          <View className="flex-row justify-between mt-1">
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              {dayjs(statsData.dailyRecords.slice(-14)[0]?.date).format("M/D")}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              {dayjs(
                statsData.dailyRecords[statsData.dailyRecords.length - 1]?.date,
              ).format("M/D")}
            </Text>
          </View>
          {/* Legend */}
          <View className="flex-row gap-3 mt-1">
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-sm bg-green-400" />
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                達成
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-sm bg-yellow-300" />
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                活動あり
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-sm bg-gray-200 dark:bg-gray-700" />
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                未活動
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
