import { useState } from "react";

import { useDeleteGoal, useUpdateGoal } from "@frontend/hooks";
import { calculateDebtBalance } from "@packages/frontend-shared";
import {
  CheckIcon,
  Cross2Icon,
  Pencil1Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
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
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const deleteGoal = useDeleteGoal();
  const updateGoal = useUpdateGoal();

  const form = useForm<EditFormData>({
    defaultValues: {
      dailyTargetQuantity: goal.dailyTargetQuantity,
    },
  });

  const handleUpdate = (data: EditFormData) => {
    updateGoal.mutate(
      {
        id: goal.id,
        data: { dailyTargetQuantity: data.dailyTargetQuantity },
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

  const isActive = true;

  if (isEditing) {
    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleUpdate)}
          className={`relative w-full h-20 rounded-lg border-2 ${statusInfo.borderColor} ${statusInfo.bgColor} animate-in zoom-in-95 duration-200 overflow-hidden`}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, ${getProgressColor(statusInfo)} ${progressPercentage}%, white ${progressPercentage}%)`,
            }}
          />
          <div className="absolute inset-0 px-3 py-2 flex items-center gap-2">
            <p className="text-xl sm:text-2xl flex-shrink-0">{activityEmoji}</p>
            <p className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-none">
              {activityName}
            </p>

            <div className="flex-1 max-w-[100px] sm:max-w-[120px]">
              <FormField
                control={form.control}
                name="dailyTargetQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        className="h-8 text-center text-sm"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-1 ml-auto">
              <Button
                type="submit"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={updateGoal.isPending}
              >
                <CheckIcon className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onEditEnd}
                className="h-8 w-8 p-0"
              >
                <Cross2Icon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>
      </Form>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`relative w-full h-20 rounded-lg border-2 ${statusInfo.borderColor} ${statusInfo.bgColor} hover:shadow-md transition-all duration-200 group overflow-hidden cursor-pointer`}
        onClick={() => setShowDetailModal(true)}
      >
        <div
          className="absolute inset-0"
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
              <p className="text-xs sm:text-sm font-bold">
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
                <span className="text-xs font-medium">{statusInfo.label}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
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

            {isActive && (
              <div className="flex flex-col gap-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditStart();
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Pencil1Icon className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </button>

      <GoalDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        goalId={goal.id}
      />
    </>
  );
};
