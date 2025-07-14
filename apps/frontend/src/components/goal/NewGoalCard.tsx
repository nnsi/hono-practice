import { useState } from "react";

import { useDeleteGoal, useUpdateGoal } from "@frontend/hooks";
import { calculateDebtBalance } from "@packages/frontend-shared";
import {
  CheckIcon,
  Cross2Icon,
  Pencil1Icon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import type { GetActivityResponse, GoalResponse } from "@dtos/response";

import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  Input,
} from "@components/ui";

import { ActivityLogCreateDialog } from "../activity/ActivityLogCreateDialog";

import { GoalDetailModal } from "./GoalDetailModal";

type GoalCardProps = {
  goal: GoalResponse;
  activityName: string;
  activityEmoji: string;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  activities: GetActivityResponse[];
  quantityUnit?: string;
  activity?: GetActivityResponse;
  isPast?: boolean;
};

type EditFormData = {
  dailyTargetQuantity: number;
};

const getProgressColor = (statusInfo: { bgColor: string }) => {
  const colorMap: Record<string, string> = {
    "bg-green-50": "rgba(34, 197, 94, 0.2)",
    "bg-red-50": "rgba(239, 68, 68, 0.2)",
    "bg-red-100": "rgba(239, 68, 68, 0.3)",
    "bg-orange-50": "rgba(251, 146, 60, 0.2)",
    "bg-gray-50": "rgba(156, 163, 175, 0.2)",
  };
  return colorMap[statusInfo.bgColor] || "rgba(156, 163, 175, 0.2)";
};

export const NewGoalCard: React.FC<GoalCardProps> = ({
  goal,
  activityName,
  activityEmoji,
  isEditing,
  onEditStart,
  onEditEnd,
  quantityUnit = "",
  activity,
  isPast = false,
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showLogCreateDialog, setShowLogCreateDialog] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const deleteGoal = useDeleteGoal();
  const updateGoal = useUpdateGoal();
  const queryClient = useQueryClient();

  const form = useForm<EditFormData>({
    defaultValues: {
      dailyTargetQuantity: goal.dailyTargetQuantity,
    },
  });

  const handleUpdate = (data: EditFormData) => {
    const quantity = data.dailyTargetQuantity;
    if (!quantity || quantity <= 0) {
      return;
    }

    updateGoal.mutate(
      {
        id: goal.id,
        data: { dailyTargetQuantity: Number(quantity) },
      },
      {
        onSuccess: () => {
          onEditEnd();
        },
      },
    );
  };

  const handleDelete = () => {
    if (confirm("このゴールを削除しますか？")) {
      deleteGoal.mutate(goal.id);
    }
  };

  const statusInfo = calculateDebtBalance(
    goal.currentBalance,
    goal.dailyTargetQuantity,
  );
  const progressPercentage =
    goal.totalTarget > 0
      ? Math.min((goal.totalActual / goal.totalTarget) * 100, 100)
      : 0;

  const handleLogCreateSuccess = async () => {
    // 目標データを再取得
    await queryClient.invalidateQueries({ queryKey: ["goals"] });
    // アニメーションを開始
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1500);
  };

  // 日次目標数量の変更ハンドラ
  const handleTargetQuantityChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldOnChange: (value: string | number) => void,
  ) => {
    const value = e.target.value;
    fieldOnChange(value === "" ? "" : Number(value));
  };

  // 削除ボタンのクリックハンドラ（編集モード）
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDelete();
  };

  // カードのクリックハンドラ
  const handleCardClick = () => {
    setShowDetailModal(true);
  };

  // カードのキーダウンハンドラ
  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setShowDetailModal(true);
    }
  };

  // 活動量登録ボタンのクリックハンドラ
  const handleLogCreateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLogCreateDialog(true);
  };

  // 編集ボタンのクリックハンドラ
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditStart();
  };

  // 削除ボタンのクリックハンドラ（過去の目標）
  const handlePastGoalDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleDelete();
  };

  const isActive = !isPast;

  if (isEditing) {
    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleUpdate)}
          className={`relative w-full h-20 rounded-lg border-2 ${statusInfo.borderColor} ${statusInfo.bgColor} shadow-sm animate-in zoom-in-95 duration-200 overflow-hidden`}
        >
          <div
            className={`absolute inset-0 ${
              isAnimating ? "transition-all duration-1000 ease-out" : ""
            }`}
            style={{
              background: `linear-gradient(to right, ${getProgressColor(statusInfo)} ${progressPercentage}%, white ${progressPercentage}%)`,
            }}
          />
          <div className="absolute inset-0 px-3 py-2 flex items-center gap-2">
            <p className="text-xl sm:text-2xl flex-shrink-0">{activityEmoji}</p>
            <p className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-none">
              {activityName}
            </p>

            <div className="flex items-center gap-1 flex-1">
              <div className="min-w-[90px] max-w-[110px]">
                <FormField
                  control={form.control}
                  name="dailyTargetQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          className="h-8 text-center text-base"
                          onChange={(e) =>
                            handleTargetQuantityChange(e, field.onChange)
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {quantityUnit}
              </span>
            </div>

            <div className="flex gap-1 ml-auto">
              <Button
                type="submit"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={updateGoal.isPending}
                title="保存"
              >
                <CheckIcon className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onEditEnd}
                className="h-8 w-8 p-0"
                title="キャンセル"
              >
                <Cross2Icon className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleDeleteClick}
                className="h-8 w-8 p-0"
                title="削除"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>
      </Form>
    );
  }

  return (
    <>
      <div
        className={`relative w-full h-20 rounded-lg border-2 ${statusInfo.borderColor} ${statusInfo.bgColor} shadow-sm hover:shadow-md transition-all duration-200 group overflow-hidden cursor-pointer`}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        role="button"
        tabIndex={0}
      >
        <div
          className={`absolute inset-0 ${
            isAnimating ? "transition-all duration-1000 ease-out" : ""
          }`}
          style={{
            background: `linear-gradient(to right, ${getProgressColor(statusInfo)} ${progressPercentage}%, white ${progressPercentage}%)`,
          }}
        />
        <div className="absolute inset-0 px-3 py-2 flex items-center gap-2">
          {/* 左側: 絵文字とアクティビティ名 */}
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <p className="text-2xl flex-shrink-0">{activityEmoji}</p>
            <p className="text-sm font-semibold truncate">{activityName}</p>
          </div>

          {/* 中央: 進捗表示 */}
          <div className="flex-1 flex flex-col items-center justify-center min-w-0">
            <div className="text-center">
              <p
                className={`text-xs sm:text-sm font-bold ${
                  goal.currentBalance < 0 ? "text-red-600" : "text-blue-600"
                }`}
              >
                {goal.currentBalance > 0 ? "+" : ""}
                {goal.currentBalance.toLocaleString()}
                <span className="text-xs">{quantityUnit}</span>
              </p>
              <p className="text-xs text-gray-600 hidden sm:block">
                実績: {goal.totalActual.toLocaleString()} /{" "}
                {goal.totalTarget.toLocaleString()}
              </p>
            </div>
          </div>

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
                  onClick={handleEditClick}
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

      <GoalDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        goalId={goal.id}
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
