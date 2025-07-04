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

  const allGoals = [...debtGoals, ...monthlyGoals];

  const getActivityName = (activityId: string) => {
    const activity = activitiesData?.find((a) => a.id === activityId);
    return activity?.name || "不明なアクティビティ";
  };

  const getActivityEmoji = (activityId: string) => {
    const activity = activitiesData?.find((a) => a.id === activityId);
    return activity?.emoji || "🎯";
  };

  return (
      <div className="container mx-auto p-4 max-w-6xl">
        {goalsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-500 text-lg">読み込み中...</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {allGoals.map((goal) => (
              <NewGoalCard
                key={goal.id}
                goal={goal}
                activityName={getActivityName(goal.activityId)}
                activityEmoji={getActivityEmoji(goal.activityId)}
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
        )}
      </div>
  );
};
