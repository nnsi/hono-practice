import { useState } from "react";

import { useGoals } from "@frontend/hooks";
import { apiClient } from "@frontend/utils";
import { useQuery } from "@tanstack/react-query";

import { GetActivitiesResponseSchema } from "@dtos/response";
import type {
  DebtGoalResponse,
  MonthlyTargetGoalResponse,
} from "@dtos/response";

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
  const debtGoals = goals.filter(
    (g): g is DebtGoalResponse => g.type === "debt",
  );
  const monthlyGoals = goals.filter(
    (g): g is MonthlyTargetGoalResponse => g.type === "monthly_target",
  );

  // 現在の日付を取得
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 現在の目標と過去の目標を分ける
  const currentDebtGoals = debtGoals.filter((goal) => {
    // 期間終了日がない、または期間終了日が未来の場合は現在の目標
    return !goal.endDate || new Date(goal.endDate) >= now;
  });

  const pastDebtGoals = debtGoals.filter((goal) => {
    // 期間終了日があり、かつ過去の場合は過去の目標
    return goal.endDate && new Date(goal.endDate) < now;
  });

  const currentMonthlyGoals = monthlyGoals.filter((goal) => {
    // targetMonthからyearとmonthを抽出 (YYYY-MM形式)
    const [targetYear, targetMonth] = goal.targetMonth.split("-").map(Number);
    // 現在の年月の目標
    return targetYear === currentYear && targetMonth === currentMonth;
  });

  const pastMonthlyGoals = monthlyGoals.filter((goal) => {
    // targetMonthからyearとmonthを抽出 (YYYY-MM形式)
    const [targetYear, targetMonth] = goal.targetMonth.split("-").map(Number);
    // 過去の年月の目標
    return (
      targetYear < currentYear ||
      (targetYear === currentYear && targetMonth < currentMonth)
    );
  });

  const currentGoals = [...currentDebtGoals, ...currentMonthlyGoals];
  const pastGoals = [...pastDebtGoals, ...pastMonthlyGoals];

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

  if (goalsLoading) {
    return (
      <div className="container mx-auto p-4 max-w-6xl flex items-center justify-center py-16">
        <p className="text-gray-500 text-lg">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* 現在の目標 */}
      <div className="flex flex-col gap-2">
        {currentGoals.map((goal) => (
          <NewGoalCard
            key={goal.id}
            goal={goal}
            activityName={getActivityName(goal.activityId)}
            activityEmoji={getActivityEmoji(goal.activityId)}
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
      </div>

      {/* 過去の目標 */}
      {pastGoals.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-600 mt-8 mb-4">
            過去の目標
          </h2>
          <div className="flex flex-col gap-2">
            {pastGoals.map((goal) => (
              <NewGoalCard
                key={goal.id}
                goal={goal}
                activityName={getActivityName(goal.activityId)}
                activityEmoji={getActivityEmoji(goal.activityId)}
                quantityUnit={getActivityUnit(goal.activityId)}
                isEditing={editingGoalId === goal.id}
                onEditStart={() => setEditingGoalId(goal.id)}
                onEditEnd={() => setEditingGoalId(null)}
                activities={activitiesData || []}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
