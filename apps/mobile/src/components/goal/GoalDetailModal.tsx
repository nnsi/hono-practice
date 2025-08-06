import type React from "react";
import { useMemo } from "react";

import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { GetActivitiesResponseSchema, type GoalResponse } from "@dtos/response";

import { useGoal, useGoalStats } from "../../hooks";
import { apiClient } from "../../utils/apiClient";
import { ActivityIcon } from "../common/ActivityIcon";

type GoalDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
};

type GoalStats = {
  daysUntilDeadline?: number;
  currentProgress: number;
  targetProgress: number;
  progressPercentage: number;
  activeDays: number;
  maxDaily: number;
  maxConsecutiveDays: number;
  daysAchieved: number;
};

const calculateGoalStats = (
  goal: GoalResponse | null | undefined,
): GoalStats => {
  const stats: GoalStats = {
    currentProgress: 0,
    targetProgress: 0,
    progressPercentage: 0,
    activeDays: 0,
    maxDaily: 0,
    maxConsecutiveDays: 0,
    daysAchieved: 0,
  };

  if (!goal) {
    return stats;
  }

  const today = new Date();
  const endDate = goal.endDate ? new Date(goal.endDate) : null;

  // 期限までの日数
  if (endDate && today < endDate) {
    stats.daysUntilDeadline = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  // 現在の進捗と目標
  stats.currentProgress = goal.totalActual;
  stats.targetProgress = goal.totalTarget;
  stats.progressPercentage =
    stats.targetProgress > 0
      ? Math.min(100, (stats.currentProgress / stats.targetProgress) * 100)
      : 0;

  return stats;
};

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  open,
  onOpenChange,
  goalId,
}) => {
  const { data: goalData } = useGoal(goalId);
  const { data: statsData, isLoading } = useGoalStats(goalId, open);

  const { data: activitiesData } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await apiClient.users.activities.$get();
      const json = await res.json();
      const parsed = GetActivitiesResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("Failed to parse activities");
      }
      return parsed.data;
    },
  });

  const goal = goalData;
  const activity = activitiesData?.find((a) => a.id === goal?.activityId);
  const activityName = activity?.name || "不明なアクティビティ";
  const activityEmoji = activity?.emoji || "🎯";
  const quantityUnit = activity?.quantityUnit || "";

  const stats = useMemo(() => {
    if (!goal) {
      return calculateGoalStats(goal);
    }

    if (!statsData || isLoading) {
      return calculateGoalStats(goal);
    }

    // 実際の統計データを使用
    const { stats: apiStats } = statsData;
    const baseStats = calculateGoalStats(goal);

    return {
      ...baseStats,
      activeDays: statsData.dailyRecords.filter((record) => record.quantity > 0)
        .length,
      maxDaily: apiStats.max,
      maxConsecutiveDays: apiStats.maxConsecutiveDays,
      daysAchieved: apiStats.achievedDays,
    };
  }, [goal, statsData, isLoading]);

  if (!goal) {
    return null;
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl">
          <View className="p-6">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                {activity ? (
                  <ActivityIcon activity={activity} size="medium" />
                ) : (
                  <Text className="text-2xl">{activityEmoji}</Text>
                )}
                <Text className="text-xl font-bold">{activityName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => onOpenChange(false)}
                className="p-2"
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            {/* Date Range */}
            <Text className="text-gray-600 mb-4">
              {goal && (
                <>
                  {new Date(goal.startDate).toLocaleDateString("ja-JP")} 〜{" "}
                  {goal.endDate
                    ? new Date(goal.endDate).toLocaleDateString("ja-JP")
                    : ""}
                </>
              )}
            </Text>

            <ScrollView className="max-h-96">
              {/* Days Until Deadline */}
              {stats.daysUntilDeadline !== undefined && (
                <View className="items-center py-4 bg-gray-50 rounded-lg mb-4">
                  <Text className="text-sm text-gray-600">期限まで</Text>
                  <Text className="text-2xl font-bold">
                    {stats.daysUntilDeadline}日
                  </Text>
                </View>
              )}

              {/* Progress Bar */}
              <View className="mb-6">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm">現在の活動量</Text>
                  <Text className="text-sm font-medium">
                    {stats.currentProgress}/{stats.targetProgress}
                    {quantityUnit}
                  </Text>
                </View>
                <View className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <View
                    className="bg-blue-500 h-full"
                    style={{ width: `${stats.progressPercentage}%` }}
                  />
                </View>
                <Text className="text-right text-sm text-gray-600 mt-1">
                  {stats.progressPercentage.toFixed(1)}%
                </Text>
              </View>

              {/* Stats Grid */}
              <View className="flex-row flex-wrap -mx-2">
                <View className="w-1/2 p-2">
                  <View className="items-center p-3 bg-gray-50 rounded-lg">
                    <Text className="text-sm text-gray-600">
                      期間中の活動日数
                    </Text>
                    <Text className="text-lg font-medium">
                      {statsData && !isLoading ? stats.activeDays : "-"}日
                    </Text>
                  </View>
                </View>
                <View className="w-1/2 p-2">
                  <View className="items-center p-3 bg-gray-50 rounded-lg">
                    <Text className="text-sm text-gray-600">
                      期間中の最大活動量
                    </Text>
                    <Text className="text-lg font-medium">
                      {statsData && !isLoading ? stats.maxDaily : "-"}
                      {statsData && !isLoading ? quantityUnit : ""}
                    </Text>
                  </View>
                </View>
                <View className="w-1/2 p-2">
                  <View className="items-center p-3 bg-gray-50 rounded-lg">
                    <Text className="text-sm text-gray-600">
                      最大連続活動日数
                    </Text>
                    <Text className="text-lg font-medium">
                      {statsData && !isLoading ? stats.maxConsecutiveDays : "-"}
                      日
                    </Text>
                  </View>
                </View>
                <View className="w-1/2 p-2">
                  <View className="items-center p-3 bg-gray-50 rounded-lg">
                    <Text className="text-sm text-gray-600">目標達成日数</Text>
                    <Text className="text-lg font-medium">
                      {statsData && !isLoading ? stats.daysAchieved : "-"}日
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};
