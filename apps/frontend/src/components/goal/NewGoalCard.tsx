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
  const [showActions, setShowActions] = useState(false);
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
          className={`relative w-full pb-[100%] rounded-2xl border-2 ${statusInfo.color} animate-in zoom-in-95 duration-200 overflow-hidden`}
          style={{
            background: `linear-gradient(to top, ${getProgressColor(statusInfo)} ${statusInfo.progress}%, transparent ${statusInfo.progress}%)`,
          }}
        >
          <div className="absolute inset-0 p-4 flex flex-col">
            <p className="text-2xl mb-1 text-center">{activityEmoji}</p>
            <p className="text-xs font-medium truncate text-center mb-2">
              {activityName}
            </p>

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
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-1 mt-auto">
              <Button
                type="submit"
                size="sm"
                className="flex-1 h-7"
                disabled={isUpdating}
              >
                <CheckIcon className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onEditEnd}
                className="flex-1 h-7"
              >
                <Cross2Icon className="w-3 h-3" />
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
        className={`relative w-full pb-[100%] rounded-2xl border-2 ${statusInfo.color} hover:shadow-lg transition-all duration-200 group overflow-hidden cursor-pointer`}
        style={{
          background: `linear-gradient(to top, ${getProgressColor(statusInfo)} ${statusInfo.progress}%, transparent ${statusInfo.progress}%)`,
        }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={() => setShowDetailModal(true)}
      >
        {/* 左上に実績値表示 */}
        {goal.type === "debt" && (
          <p className="absolute top-2 left-2 text-sm font-bold">
            {goal.currentBalance > 0 ? "+" : ""}
            {goal.currentBalance}
            {quantityUnit}
            {(() => {
              // 期間中の合計値と当日時点での目標値を計算
              const today = new Date();
              const startDate = new Date(goal.startDate);
              const endDate = goal.endDate ? new Date(goal.endDate) : null;

              // 開始日から今日までの経過日数（開始日を含む）
              const elapsedDays = Math.max(
                1,
                Math.floor(
                  (today.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24),
                ) + 1,
              );

              // 期間中の合計目標値
              let totalTarget = 0;
              let currentTarget = 0;

              if (endDate) {
                // 終了日が設定されている場合
                const totalDays =
                  Math.ceil(
                    (endDate.getTime() - startDate.getTime()) /
                      (1000 * 60 * 60 * 24),
                  ) + 1;
                totalTarget = goal.dailyTargetQuantity * totalDays;

                // 今日が期間内の場合のみ当日時点の目標値を計算
                if (today <= endDate) {
                  currentTarget = goal.dailyTargetQuantity * elapsedDays;
                } else {
                  // 期間を過ぎている場合は全期間の目標値
                  currentTarget = totalTarget;
                }
              } else {
                // 終了日が設定されていない場合は今日までの累計
                totalTarget = goal.dailyTargetQuantity * elapsedDays;
                currentTarget = totalTarget;
              }

              return ` (${goal.totalActual}/${currentTarget})`;
            })()}
          </p>
        )}
        {goal.type === "monthly_target" && (
          <p className="absolute top-2 left-2 text-sm font-bold">
            {goal.currentQuantity}/{goal.targetQuantity}
            {quantityUnit}
          </p>
        )}

        <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center">
          <p className="text-3xl mb-2">{activityEmoji}</p>
          <p className="text-sm font-semibold truncate w-full">
            {activityName}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-lg">{statusInfo.emoji}</span>
            <span className="text-xs font-medium">{statusInfo.label}</span>
          </div>

          {goal.type === "debt" && (
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
          )}

          {goal.type === "monthly_target" && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(`${goal.targetMonth}-01`).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
              })}
            </p>
          )}
        </div>

        {showActions && isActive && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEditStart();
              }}
              className="absolute bottom-2 right-8 h-6 w-6 p-0 animate-in fade-in duration-200"
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
              className="absolute bottom-2 right-2 h-6 w-6 p-0 text-red-600 hover:text-red-700 animate-in fade-in duration-200"
            >
              <TrashIcon className="w-3 h-3" />
            </Button>
          </>
        )}
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
