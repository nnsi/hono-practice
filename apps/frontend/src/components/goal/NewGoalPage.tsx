import { useState } from "react";

import { useGoals } from "@frontend/hooks/api";
import { apiClient } from "@frontend/utils";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";

import { GetActivitiesResponseSchema } from "@dtos/response";

import { Card, CardContent } from "@components/ui";

import { NewGoalCard } from "./NewGoalCard";
import { NewGoalDialog } from "./NewGoalDialog";

export const NewGoalPage: React.FC = () => {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
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

  // 編集開始時のハンドラを作成する関数
  const createEditStartHandler = (goalId: string) => {
    return () => setEditingGoalId(goalId);
  };

  // 編集終了時のハンドラ
  const handleEditEnd = () => {
    setEditingGoalId(null);
  };

  // 目標作成完了時のハンドラ
  const handleGoalCreated = () => {
    setEditingGoalId(null);
    setCreateDialogOpen(false);
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
            onEditStart={createEditStartHandler(goal.id)}
            onEditEnd={handleEditEnd}
            activities={activitiesData || []}
            activity={getActivity(goal.activityId)}
          />
        ))}

        <Card
          onClick={() => setCreateDialogOpen(true)}
          className="w-full h-20 cursor-pointer shadow-sm rounded-lg border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:shadow-md hover:border-gray-400 transition-all duration-200 group"
        >
          <CardContent className="flex items-center justify-center gap-2 p-0 h-full">
            <PlusCircledIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            <span className="text-sm text-gray-500 group-hover:text-gray-700">
              新規目標を追加
            </span>
          </CardContent>
        </Card>
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
                onEditStart={createEditStartHandler(goal.id)}
                onEditEnd={handleEditEnd}
                activities={activitiesData || []}
                activity={getActivity(goal.activityId)}
                isPast={true}
              />
            ))}
          </div>
        </>
      )}

      <NewGoalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        activities={activitiesData || []}
        onSuccess={handleGoalCreated}
      />
    </div>
  );
};
