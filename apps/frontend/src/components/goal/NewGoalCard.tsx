import { useState } from "react";

import { useDeleteGoal, useUpdateGoal } from "@frontend/hooks";
import {
  calculateDebtBalance,
  calculateMonthlyProgress,
} from "@packages/frontend-shared";
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

type GoalCardProps = {
  goal: DebtGoalResponse | MonthlyTargetGoalResponse;
  activityName: string;
  activityEmoji: string;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  activities: GetActivityResponse[];
};

type EditFormData = {
  dailyTargetQuantity?: number;
  targetQuantity?: number;
};

export const NewGoalCard: React.FC<GoalCardProps> = ({
  goal,
  activityName,
  activityEmoji,
  isEditing,
  onEditStart,
  onEditEnd,
}) => {
  const [showActions, setShowActions] = useState(false);
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

      if (goal.endDate && new Date(goal.endDate) < new Date()) {
        return {
          emoji: "✅",
          color: "border-green-400 bg-green-50",
          label: "達成",
        };
      }
      if (status === "debt") {
        return {
          emoji: "📉",
          color: "border-red-400 bg-red-50",
          label: `${daysCount}日負債`,
        };
      }
      if (status === "savings") {
        return {
          emoji: "📈",
          color: "border-blue-400 bg-blue-50",
          label: `${daysCount}日貯金`,
        };
      }
      return { emoji: "⚖️", color: "border-gray-400 bg-gray-50", label: "中立" };
    }

    // Calculate remaining days in the month
    const targetDate = new Date(`${goal.targetMonth}-01`);
    const endOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0,
    );
    const today = new Date();
    const remainingDays = Math.max(
      0,
      Math.ceil(
        (endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    const progress = calculateMonthlyProgress(
      goal.currentQuantity,
      goal.targetQuantity,
      remainingDays,
    );
    if (progress.isAchieved) {
      return {
        emoji: "🏆",
        color: "border-yellow-400 bg-yellow-50",
        label: "達成",
      };
    }
    if (progress.progressPercentage >= 70) {
      return {
        emoji: "📊",
        color: "border-green-400 bg-green-50",
        label: `${Math.round(progress.progressPercentage)}%`,
      };
    }
    if (progress.progressPercentage >= 40) {
      return {
        emoji: "⚡",
        color: "border-orange-400 bg-orange-50",
        label: `${Math.round(progress.progressPercentage)}%`,
      };
    }
    return {
      emoji: "⚠️",
      color: "border-red-400 bg-red-50",
      label: `${Math.round(progress.progressPercentage)}%`,
    };
  };

  const statusInfo = getStatusInfo();
  const isActive = !isDeleting && !isUpdating;

  if (isEditing) {
    return (
      <div
        className={`aspect-square rounded-2xl border-2 ${statusInfo.color} p-4 animate-in zoom-in-95 duration-200`}
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleUpdate)}
            className="h-full flex flex-col"
          >
            <div className="text-center mb-2">
              <div className="text-2xl mb-1">{activityEmoji}</div>
              <div className="text-xs font-medium truncate">{activityName}</div>
            </div>

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
          </form>
        </Form>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`aspect-square rounded-2xl border-2 ${statusInfo.color} p-4 cursor-pointer hover:shadow-lg transition-all duration-200 relative group text-left`}
      onClick={() => !showActions && onEditStart()}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="text-3xl mb-2">{activityEmoji}</div>
        <div className="text-sm font-semibold truncate w-full">
          {activityName}
        </div>
        <div className="flex items-center gap-1 mt-2">
          <span className="text-lg">{statusInfo.emoji}</span>
          <span className="text-xs font-medium">{statusInfo.label}</span>
        </div>

        {goal.type === "debt" && (
          <div className="text-xs text-gray-600 mt-1">
            日目標: {goal.dailyTargetQuantity}
          </div>
        )}

        {goal.type === "monthly_target" && (
          <div className="text-xs text-gray-600 mt-1">
            月目標: {goal.targetQuantity}
          </div>
        )}
      </div>

      {showActions && isActive && (
        <div className="absolute top-2 right-2 flex gap-1 animate-in fade-in duration-200">
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
    </button>
  );
};
