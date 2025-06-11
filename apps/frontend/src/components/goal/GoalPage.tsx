import { useState } from "react";

import { useGoals } from "@frontend/hooks";
import { apiClient } from "@frontend/utils";
import { PlusIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";

import { GetActivitiesResponseSchema } from "@dtos/response";

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui";

import { GoalCreateDialog } from "./GoalCreateDialog";
import { DebtGoalCard } from "./DebtGoalCard";
import { MonthlyGoalCard } from "./MonthlyGoalCard";

export const GoalPage: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [goalTypeFilter, setGoalTypeFilter] = useState<"all" | "debt" | "monthly_target">("all");

  const { data: goalsData, isLoading: goalsLoading } = useGoals(
    goalTypeFilter === "all" ? undefined : { type: goalTypeFilter }
  );

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
  const debtGoals = goals.filter((g) => g.type === "debt");
  const monthlyGoals = goals.filter((g) => g.type === "monthly_target");

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

      <Tabs value={goalTypeFilter} onValueChange={(v) => setGoalTypeFilter(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="debt">負債目標</TabsTrigger>
          <TabsTrigger value="monthly_target">月間目標</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {goalsLoading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : goals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              目標がありません。新規目標を作成してください。
            </div>
          ) : (
            <>
              {debtGoals.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">負債目標</h2>
                  {debtGoals.map((goal) => (
                    <DebtGoalCard
                      key={goal.id}
                      goal={goal}
                      activityName={getActivityName(goal.activityId)}
                    />
                  ))}
                </div>
              )}
              {monthlyGoals.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">月間目標</h2>
                  {monthlyGoals.map((goal) => (
                    <MonthlyGoalCard
                      key={goal.id}
                      goal={goal}
                      activityName={getActivityName(goal.activityId)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="debt" className="space-y-4">
          {goalsLoading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : debtGoals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              負債目標がありません。
            </div>
          ) : (
            debtGoals.map((goal) => (
              <DebtGoalCard
                key={goal.id}
                goal={goal}
                activityName={getActivityName(goal.activityId)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="monthly_target" className="space-y-4">
          {goalsLoading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : monthlyGoals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              月間目標がありません。
            </div>
          ) : (
            monthlyGoals.map((goal) => (
              <MonthlyGoalCard
                key={goal.id}
                goal={goal}
                activityName={getActivityName(goal.activityId)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <GoalCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        activities={activitiesData || []}
      />
    </div>
  );
};