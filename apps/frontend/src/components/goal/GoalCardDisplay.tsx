import { Button } from "@components/ui";
import type { GetActivityResponse, GoalResponse } from "@dtos/response";
import type { useNewGoalCard } from "@frontend/hooks/feature/goal/useNewGoalCard";
import { Pencil1Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";

import { ActivityLogCreateDialog } from "../activity/ActivityLogCreateDialog";
import { ActivityIcon } from "../common/ActivityIcon";
import { GoalDetailModal } from "./GoalDetailModal";

export type GoalCardDisplayProps = {
  goal: GoalResponse;
  activityName: string;
  activityEmoji: string;
  quantityUnit: string;
  activity?: GetActivityResponse;
  hideGraph: boolean;
  hookValues: ReturnType<typeof useNewGoalCard>;
  thisMonthInactiveDates: string[];
  onEditStart: () => void;
};

export const GoalCardDisplay: React.FC<GoalCardDisplayProps> = ({
  goal,
  activityName,
  activityEmoji,
  quantityUnit,
  activity,
  hideGraph,
  hookValues,
  thisMonthInactiveDates,
  onEditStart,
}) => {
  const {
    showDetailModal,
    setShowDetailModal,
    showLogCreateDialog,
    setShowLogCreateDialog,
    isAnimating,
    statusInfo,
    progressPercentage,
    progressColor,
    isActive,
    settings,
    handleLogCreateSuccess,
    handleCardClick,
    handleCardKeyDown,
    handleLogCreateClick,
    handleEditClick,
    handlePastGoalDeleteClick,
  } = hookValues;

  return (
    <>
      <div className="w-full">
        <div
          className={`relative w-full h-20 rounded-lg border-2 ${statusInfo.borderColor} ${statusInfo.bgColor} shadow-sm hover:shadow-md transition-all duration-200 group overflow-hidden cursor-pointer`}
          onClick={handleCardClick}
          onKeyDown={handleCardKeyDown}
          role="button"
          tabIndex={0}
        >
          {!hideGraph && (
            <div
              className={`absolute inset-0 ${
                isAnimating ? "transition-all duration-1000 ease-out" : ""
              }`}
              style={{
                background: `linear-gradient(to right, ${progressColor} ${progressPercentage}%, white ${progressPercentage}%)`,
              }}
            />
          )}
          <div className="absolute inset-0 px-3 py-2 flex items-center gap-2">
            {/* 左側: 絵文字とアクティビティ名 */}
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              {activity ? (
                <ActivityIcon
                  activity={activity}
                  size="medium"
                  className="flex-shrink-0"
                />
              ) : (
                <p className="text-2xl flex-shrink-0">{activityEmoji}</p>
              )}
              <div className="flex flex-col">
                <p className="text-sm font-semibold truncate">{activityName}</p>
                <p
                  className={`text-xs ${
                    goal.currentBalance < 0 ? "text-red-600" : "text-blue-600"
                  }`}
                >
                  {goal.currentBalance < 0 ? "負債" : "貯金"}:{" "}
                  {Math.abs(goal.currentBalance).toLocaleString()}
                  {quantityUnit}
                </p>
              </div>
            </div>

            {/* 中央: 進捗表示 */}
            <div className="flex-1 flex flex-col items-center justify-center min-w-0" />

            {/* 右側: ステータスと期間 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <span
                    className={`text-xs font-medium ${
                      goal.currentBalance < 0 ? "text-red-600" : "text-blue-600"
                    }`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(goal.startDate).toLocaleDateString("ja-JP", {
                    month: "numeric",
                    day: "numeric",
                  })}
                  〜
                  {goal.endDate
                    ? new Date(goal.endDate).toLocaleDateString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                      })
                    : ""}
                </p>
              </div>

              {isActive ? (
                <div className="flex flex-col gap-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleLogCreateClick}
                    className="h-6 w-6 p-0"
                    title="活動量を登録"
                  >
                    <PlusIcon className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleEditClick(e, onEditStart)}
                    className="h-6 w-6 p-0"
                    title="目標を編集"
                  >
                    <Pencil1Icon className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handlePastGoalDeleteClick}
                  className="h-6 w-6 p-0"
                  title="削除"
                >
                  <TrashIcon className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* やらなかった日付の表示（当月のみ） */}
        {settings.showInactiveDates && thisMonthInactiveDates.length > 0 && (
          <div className="mt-1 px-3 py-1 text-xs text-gray-500">
            <span className="font-medium">やらなかった日付: </span>
            {thisMonthInactiveDates.slice(0, 3).map((date, index) => (
              <span key={date}>
                {index > 0 && ", "}
                {new Date(date).toLocaleDateString("ja-JP", {
                  month: "numeric",
                  day: "numeric",
                })}
              </span>
            ))}
            {thisMonthInactiveDates.length > 3 && (
              <span> 他{thisMonthInactiveDates.length - 3}日</span>
            )}
          </div>
        )}
      </div>

      <GoalDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        goalId={goal.id}
        goal={goal}
        hideGraph={hideGraph}
      />

      {activity && (
        <ActivityLogCreateDialog
          open={showLogCreateDialog}
          onOpenChange={setShowLogCreateDialog}
          activity={activity}
          date={new Date()}
          onSuccess={handleLogCreateSuccess}
        />
      )}
    </>
  );
};
