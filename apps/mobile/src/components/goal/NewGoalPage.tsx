import type React from "react";
import { useState } from "react";

import { GetActivitiesResponseSchema } from "@packages/types/response/GetActivitiesResponse";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { useGoals } from "../../hooks";
import { apiClient } from "../../utils/apiClient";
import { NewGoalCard } from "./NewGoalCard";
import { NewGoalSlot } from "./NewGoalSlot";

export const NewGoalPage: React.FC = () => {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const { data: goalsData, isLoading: goalsLoading } = useGoals();

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

  const goals = goalsData?.goals || [];

  // 現在の日付を取得
  const now = new Date();

  // 現在の目標と過去の目標を分ける
  const currentGoals = goals.filter((goal) => {
    // 期間終了日がない、または期間終了日が未来の場合は現在の目標
    return !goal.endDate || new Date(goal.endDate) >= now;
  });

  const pastGoals = goals.filter((goal) => {
    // 期間終了日があり、かつ過去の場合は過去の目標
    return goal.endDate && new Date(goal.endDate) < now;
  });

  const getActivityName = (activityId: string) => {
    const activity = activitiesData?.find((a) => a.id === activityId);
    return activity?.name || "不明なアクティビティ";
  };

  const getActivityEmoji = (activityId: string) => {
    const activity = activitiesData?.find((a) => a.id === activityId);
    return activity?.emoji || "🎯";
  };

  const getActivityUnit = (activityId: string) => {
    const activity = activitiesData?.find((a) => a.id === activityId);
    return activity?.quantityUnit || "";
  };

  const getActivity = (activityId: string) => {
    return activitiesData?.find((a) => a.id === activityId);
  };

  if (goalsLoading) {
    return (
      <View className="flex-1 items-center justify-center py-16">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-500 text-lg mt-4">読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1">
      <View className="p-4">
        {/* 現在の目標 */}
        <View className="gap-2">
          {currentGoals.map((goal) => (
            <NewGoalCard
              key={goal.id}
              goal={goal}
              activityName={getActivityName(goal.activityId)}
              activityEmoji={getActivityEmoji(goal.activityId)}
              activity={getActivity(goal.activityId)}
              quantityUnit={getActivityUnit(goal.activityId)}
              isEditing={editingGoalId === goal.id}
              onEditStart={() => setEditingGoalId(goal.id)}
              onEditEnd={() => setEditingGoalId(null)}
              activities={activitiesData || []}
            />
          ))}

          <NewGoalSlot
            activities={activitiesData || []}
            onCreated={() => setEditingGoalId(null)}
          />
        </View>

        {/* 過去の目標 */}
        {pastGoals.length > 0 && (
          <>
            <Text className="text-lg font-semibold text-gray-600 mt-8 mb-4">
              過去の目標
            </Text>
            <View className="gap-2">
              {pastGoals.map((goal) => (
                <NewGoalCard
                  key={goal.id}
                  goal={goal}
                  activityName={getActivityName(goal.activityId)}
                  activityEmoji={getActivityEmoji(goal.activityId)}
                  activity={getActivity(goal.activityId)}
                  quantityUnit={getActivityUnit(goal.activityId)}
                  isEditing={editingGoalId === goal.id}
                  onEditStart={() => setEditingGoalId(goal.id)}
                  onEditEnd={() => setEditingGoalId(null)}
                  activities={activitiesData || []}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
};
