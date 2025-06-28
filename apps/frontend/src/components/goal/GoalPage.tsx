import { useState } from "react";

import { useGoals } from "@frontend/hooks";
import { apiClient } from "@frontend/utils";
import { PlusIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";

import { GetActivitiesResponseSchema } from "@dtos/response";
import type {
  DebtGoalResponse,
  MonthlyTargetGoalResponse,
} from "@dtos/response";

import { Button } from "@components/ui";

import { DebtGoalCard } from "./DebtGoalCard";
import { GoalCreateDialog } from "./GoalCreateDialog";
import { MonthlyGoalCard } from "./MonthlyGoalCard";

export const GoalPage: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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

  const getActivityName = (activityId: string) => {
    const activity = activitiesData?.find((a) => a.id === activityId);
    return activity?.name || "不明なアクティビティ";
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">目標管理</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="mr-2" />
          新規目標
        </Button>
      </div>

      <div className="space-y-4">
        {goalsLoading ? (
          <div className="text-center py-8">読み込み中...</div>
        ) : goals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            目標がありません。新規目標を作成してください。
          </div>
        ) : (
          <>
            {debtGoals.map((goal) => (
              <DebtGoalCard
                key={goal.id}
                goal={goal}
                activityName={getActivityName(goal.activityId)}
              />
            ))}
            {monthlyGoals.map((goal) => (
              <MonthlyGoalCard
                key={goal.id}
                goal={goal}
                activityName={getActivityName(goal.activityId)}
              />
            ))}
          </>
        )}
      </div>

      <GoalCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        activities={activitiesData || []}
      />
    </div>
  );
};
