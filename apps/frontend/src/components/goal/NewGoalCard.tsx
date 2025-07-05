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

import type {
  DebtGoalResponse,
  GetActivityResponse,
  MonthlyTargetGoalResponse,
} from "@dtos/response";

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
  goal: DebtGoalResponse | MonthlyTargetGoalResponse;
  activityName: string;
  activityEmoji: string;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  activities: GetActivityResponse[];
  quantityUnit?: string;
};

type EditFormData = {
  dailyTargetQuantity?: number;
  targetQuantity?: number;
};

const getProgressColor = (statusInfo: { bgColor: string }) => {
  const colorMap: Record<string, string> = {
    "bg-green-50": "rgba(34, 197, 94, 0.2)",
    "bg-red-50": "rgba(239, 68, 68, 0.2)",
    "bg-red-100": "rgba(239, 68, 68, 0.3)",
    "bg-blue-50": "rgba(59, 130, 246, 0.2)",
    "bg-yellow-50": "rgba(250, 204, 21, 0.2)",
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
  const { mutate: deleteGoal, isPending: isDeleting } = useDeleteGoal();
  const { mutate: updateGoal, isPending: isUpdating } = useUpdateGoal();

  const form = useForm<EditFormData>({
    defaultValues: {
      dailyTargetQuantity:
        goal.type === "debt" ? goal.dailyTargetQuantity : undefined,
      targetQuantity:
        goal.type === "monthly_target" ? goal.targetQuantity : undefined,
    },
  });

  const handleUpdate = (data: EditFormData) => {
    if (goal.type === "debt" && data.dailyTargetQuantity !== undefined) {
      updateGoal(
        {
          type: "debt",
          id: goal.id,
          data: { dailyTargetQuantity: data.dailyTargetQuantity },
        },
        {
          onSuccess: () => {
            onEditEnd();
          },
        },
      );
    } else if (
      goal.type === "monthly_target" &&
      data.targetQuantity !== undefined
    ) {
      updateGoal(
        {
          type: "monthly_target",
          id: goal.id,
          data: { targetQuantity: data.targetQuantity },
        },
        {
          onSuccess: () => {
            onEditEnd();
          },
        },
      );
    }
  };

  const handleDelete = () => {
    if (confirm("このゴールを削除しますか？")) {
      deleteGoal({ type: goal.type, id: goal.id });
    }
  };

  const getStatusInfo = () => {
    if (goal.type === "debt") {
      const { status } = calculateDebtBalance(goal.totalActual, goal.totalDebt);
      const absBalance = Math.abs(goal.currentBalance);
      const daysCount = Math.ceil(absBalance / goal.dailyTargetQuantity);

      // 進捗率の計算（負債型の場合は返済率）
      const progressPercentage =
        goal.totalDebt > 0
          ? Math.min(
              100,
              Math.max(0, (goal.totalActual / goal.totalDebt) * 100),
            )
          : 100;

      if (goal.endDate && new Date(goal.endDate) < new Date()) {
        // 期限切れの場合、currentBalanceが0以上（負債がない）かチェック
        if (goal.currentBalance >= 0) {
          return {
            emoji: "✅",
            color: "border-green-400",
            bgColor: "bg-green-50",
            label: "達成",
            progress: 100,
          };
        }
        // 期限切れで負債が残っている場合
        return {
          emoji: "❌",
          color: "border-red-600",
          bgColor: "bg-red-100",
          label: "未達成",
          progress: progressPercentage,
        };
      }
      if (status === "debt") {
        return {
          emoji: "📉",
          color: "border-red-400",
          bgColor: "bg-red-50",
          label: `${daysCount}日負債`,
          progress: progressPercentage,
        };
      }
      if (status === "savings") {
        return {
          emoji: "📈",
          color: "border-blue-400",
          bgColor: "bg-blue-50",
          label: `${daysCount}日貯金`,
          progress: 100,
        };
      }
      return {
        emoji: "⚖️",
        color: "border-gray-400",
        bgColor: "bg-gray-50",
        label: "中立",
        progress: progressPercentage,
      };
    }

    // Calculate days in month and elapsed days
    const targetDate = new Date(`${goal.targetMonth}-01`);
    const startOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0,
    );
    const today = new Date();

    // 月の総日数
    const totalDaysInMonth = endOfMonth.getDate();

    // 経過日数（今日が対象月の場合は今日までの日数、それ以外は月の総日数または0）
    let elapsedDays = 0;
    if (today >= startOfMonth && today <= endOfMonth) {
      elapsedDays = today.getDate();
    } else if (today > endOfMonth) {
      elapsedDays = totalDaysInMonth;
    }

    // 日割り進捗率（経過日数ベース）
    const expectedProgress =
      elapsedDays > 0 ? (elapsedDays / totalDaysInMonth) * 100 : 0;
    const actualProgress =
      goal.targetQuantity > 0
        ? (goal.currentQuantity / goal.targetQuantity) * 100
        : 0;

    // 実際の進捗率と期待される進捗率の比較
    const progressRatio =
      expectedProgress > 0 ? (actualProgress / expectedProgress) * 100 : 0;

    if (goal.currentQuantity >= goal.targetQuantity) {
      return {
        emoji: "🏆",
        color: "border-yellow-400",
        bgColor: "bg-yellow-50",
        label: "達成",
        progress: 100,
      };
    }

    // 日割り計算に基づく判定
    if (progressRatio >= 80) {
      return {
        emoji: "📊",
        color: "border-green-400",
        bgColor: "bg-green-50",
        label: "順調",
        progress: actualProgress,
      };
    }
    if (progressRatio >= 50) {
      return {
        emoji: "⚡",
        color: "border-orange-400",
        bgColor: "bg-orange-50",
        label: "怪しい",
        progress: actualProgress,
      };
    }
    return {
      emoji: "⚠️",
      color: "border-red-400",
      bgColor: "bg-red-50",
      label: "危ない",
      progress: actualProgress,
    };
  };

  const statusInfo = getStatusInfo();
  const isActive = !isDeleting && !isUpdating;

  if (isEditing) {
    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleUpdate)}
          className={`relative w-full h-20 rounded-lg border-2 ${statusInfo.color} animate-in zoom-in-95 duration-200 overflow-hidden`}
          style={{
            background: `linear-gradient(to right, ${getProgressColor(statusInfo)} ${statusInfo.progress}%, transparent ${statusInfo.progress}%)`,
          }}
        >
          <div className="absolute inset-0 px-3 py-2 flex items-center gap-2">
            <p className="text-xl sm:text-2xl flex-shrink-0">{activityEmoji}</p>
            <p className="text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-none">
              {activityName}
            </p>

            <div className="flex-1 max-w-[100px] sm:max-w-[120px]">
              {goal.type === "debt" ? (
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
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="targetQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          className="h-8 text-center text-sm"
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex gap-1 ml-auto">
              <Button
                type="submit"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isUpdating}
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
        className={`relative w-full h-20 rounded-lg border-2 ${statusInfo.color} hover:shadow-md transition-all duration-200 group overflow-hidden cursor-pointer`}
        style={{
          background: `linear-gradient(to right, ${getProgressColor(statusInfo)} ${statusInfo.progress}%, transparent ${statusInfo.progress}%)`,
        }}
        onClick={() => setShowDetailModal(true)}
      >
        <div className="absolute inset-0 px-3 py-2 flex items-center gap-2">
          {/* 左側: 絵文字とアクティビティ名 */}
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <p className="text-2xl flex-shrink-0">{activityEmoji}</p>
            <p className="text-sm font-semibold truncate">{activityName}</p>
          </div>

          {/* 中央: 進捗表示 */}
          <div className="flex-1 flex flex-col items-center justify-center min-w-0">
            {goal.type === "debt" && (
              <div className="text-center">
                <p className="text-xs sm:text-sm font-bold">
                  {goal.currentBalance > 0 ? "+" : ""}
                  {goal.currentBalance.toLocaleString()}
                  <span className="text-xs">{quantityUnit}</span>
                </p>
                <p className="text-xs text-gray-600 hidden sm:block">
                  実績: {goal.totalActual.toLocaleString()} /{" "}
                  {goal.totalDebt.toLocaleString()}
                </p>
              </div>
            )}
            {goal.type === "monthly_target" && (
              <div className="text-center">
                <p className="text-xs sm:text-sm font-bold">
                  {goal.currentQuantity.toLocaleString()}/
                  {goal.targetQuantity.toLocaleString()}
                  <span className="text-xs">{quantityUnit}</span>
                </p>
                <p className="text-xs text-gray-600 hidden sm:block">
                  {new Date(`${goal.targetMonth}-01`).toLocaleDateString(
                    "ja-JP",
                    {
                      year: "numeric",
                      month: "long",
                    },
                  )}
                </p>
              </div>
            )}
          </div>

          {/* 右側: ステータスと期間 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <span className="text-sm sm:text-base">{statusInfo.emoji}</span>
                <span className="text-xs font-medium hidden sm:inline">
                  {statusInfo.label}
                </span>
              </div>
              {goal.type === "debt" && (
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
              )}
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
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        goal={goal}
        activityName={activityName}
        activityEmoji={activityEmoji}
        quantityUnit={quantityUnit}
      />
    </>
  );
};
