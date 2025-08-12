import { useGoalDetailModal } from "@frontend/hooks/feature/goal/useGoalDetailModal";

import type { GoalResponse } from "@dtos/response";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/ui";

import { ActivityIcon } from "../common/ActivityIcon";


type GoalDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goal: GoalResponse; // 親から目標データを受け取る
  hideGraph?: boolean;
};

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  open,
  onOpenChange,
  goalId,
  goal: goalProp, // 親から受け取ったgoalデータ
  hideGraph = false,
}) => {
  const {
    goal,
    stats,
    isPastGoal,
    activity,
    activityName,
    activityEmoji,
    quantityUnit,
    isLoading,
    statsData,
  } = useGoalDetailModal(goalId, goalProp, open);

  if (!goal) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activity ? (
              <ActivityIcon activity={activity} size="medium" />
            ) : (
              <span className="text-2xl">{activityEmoji}</span>
            )}
            <span>{activityName}</span>
          </DialogTitle>
          <DialogDescription>
            {goal && (
              <>
                {new Date(goal.startDate).toLocaleDateString("ja-JP")} 〜{" "}
                {goal.endDate
                  ? new Date(goal.endDate).toLocaleDateString("ja-JP")
                  : ""}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {stats.daysUntilDeadline !== undefined && (
            <div className="text-center py-2 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">期限まで</p>
              <p className="text-2xl font-bold">{stats.daysUntilDeadline}日</p>
            </div>
          )}

          {!hideGraph && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{isPastGoal ? "活動量" : "現在の活動量"}</span>
                <span className="font-medium">
                  {stats.currentProgress}/{stats.targetProgress}
                  {quantityUnit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${stats.progressPercentage}%` }}
                />
              </div>
              <p className="text-right text-sm text-gray-600 mt-1">
                {stats.progressPercentage.toFixed(1)}%
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">期間中の活動日数</p>
              <p className="text-lg font-medium">
                {statsData && !isLoading ? stats.activeDays : "-"}日
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">期間中の最大活動量</p>
              <p className="text-lg font-medium">
                {statsData && !isLoading ? stats.maxDaily : "-"}
                {statsData && !isLoading ? quantityUnit : ""}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">最大連続活動日数</p>
              <p className="text-lg font-medium">
                {statsData && !isLoading ? stats.maxConsecutiveDays : "-"}日
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">目標達成日数</p>
              <p className="text-lg font-medium">
                {statsData && !isLoading ? stats.daysAchieved : "-"}日
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
