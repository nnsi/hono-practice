import type React from "react";
import { useState } from "react";

import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Controller, useForm } from "react-hook-form";

import type { GetActivityResponse, GoalResponse } from "@dtos/response";

import { useDeleteGoal, useUpdateGoal } from "../../hooks/useGoals";
import { Alert } from "../../utils/AlertWrapper";
import { ActivityIcon } from "../common/ActivityIcon";

import { GoalDetailModal } from "./GoalDetailModal";

type GoalCardProps = {
  goal: GoalResponse;
  activityName: string;
  activityEmoji: string;
  activity?: GetActivityResponse;
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

const getBorderColor = (statusInfo: { borderColor: string }) => {
  const colorMap: Record<string, string> = {
    "border-green-300": "#86efac",
    "border-red-300": "#fca5a5",
    "border-red-400": "#f87171",
    "border-orange-300": "#fdba74",
    "border-gray-300": "#d1d5db",
  };
  return colorMap[statusInfo.borderColor] || "#d1d5db";
};

const getBackgroundColor = (statusInfo: { bgColor: string }) => {
  const colorMap: Record<string, string> = {
    "bg-green-50": "#f0fdf4",
    "bg-red-50": "#fef2f2",
    "bg-red-100": "#fee2e2",
    "bg-orange-50": "#fff7ed",
    "bg-gray-50": "#f9fafb",
  };
  return colorMap[statusInfo.bgColor] || "#f9fafb";
};

export const NewGoalCard: React.FC<GoalCardProps> = ({
  goal,
  activityName,
  activityEmoji,
  activity,
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
    Alert.alert("削除確認", "このゴールを削除しますか？", [
      {
        text: "キャンセル",
        style: "cancel",
      },
      {
        text: "削除",
        style: "destructive",
        onPress: () => {
          deleteGoal.mutate(goal.id);
        },
      },
    ]);
  };

  // Use the same calculateDebtBalance logic from frontend-shared
  const calculateDebtBalance = (
    currentBalance: number,
    dailyTarget: number,
  ) => {
    const daysOfDebt = Math.floor(Math.abs(currentBalance) / dailyTarget);
    const daysOfSavings = Math.floor(currentBalance / dailyTarget);

    if (currentBalance < 0) {
      if (daysOfDebt >= 3) {
        return {
          label: `${daysOfDebt}日分の負債`,
          bgColor: "bg-red-100",
          borderColor: "border-red-400",
        };
      }
      if (daysOfDebt >= 1) {
        return {
          label: `${daysOfDebt}日分の負債`,
          bgColor: "bg-red-50",
          borderColor: "border-red-300",
        };
      }
      return {
        label: "わずかな負債",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-300",
      };
    }
    if (currentBalance > 0) {
      return {
        label: `${daysOfSavings}日分の貯金`,
        bgColor: "bg-green-50",
        borderColor: "border-green-300",
      };
    }
    return {
      label: "±0",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-300",
    };
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
      <View
        className="relative h-20 rounded-lg border-2 overflow-hidden"
        style={{
          borderColor: getBorderColor(statusInfo),
          backgroundColor: getBackgroundColor(statusInfo),
        }}
      >
        <View
          className="absolute inset-0"
          style={{
            backgroundColor: getProgressColor(statusInfo),
            width: `${progressPercentage}%`,
          }}
        />
        <View className="absolute inset-0 px-3 py-2 flex-row items-center gap-2">
          {activity ? (
            <ActivityIcon
              activity={activity}
              size="small"
              className="flex-shrink-0"
            />
          ) : (
            <Text className="text-xl flex-shrink-0">{activityEmoji}</Text>
          )}
          <Text
            className="text-xs font-medium truncate"
            style={{ maxWidth: 80 }}
          >
            {activityName}
          </Text>

          <View className="flex-1 flex-row items-center gap-1">
            <View style={{ minWidth: 90, maxWidth: 110 }}>
              <Controller
                control={form.control}
                name="dailyTargetQuantity"
                render={({ field }) => (
                  <TextInput
                    value={String(field.value)}
                    onChangeText={(text) => {
                      const value = text === "" ? 0 : Number(text);
                      field.onChange(value);
                    }}
                    keyboardType="numeric"
                    className="h-9 px-3 py-1 bg-white rounded-md border border-gray-300 text-center text-base"
                  />
                )}
              />
            </View>
            <Text className="text-xs text-gray-600 flex-shrink-0">
              {quantityUnit}
            </Text>
          </View>

          <View className="flex-row gap-1 ml-auto">
            <TouchableOpacity
              onPress={form.handleSubmit(handleUpdate)}
              disabled={updateGoal.isPending}
              className="h-8 w-8 items-center justify-center bg-primary rounded"
            >
              <Ionicons name="checkmark" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onEditEnd}
              className="h-8 w-8 items-center justify-center bg-white rounded border border-gray-300"
            >
              <Ionicons name="close" size={16} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowDetailModal(true)}
        className="relative h-20 rounded-lg border-2 overflow-hidden"
        style={{
          borderColor: getBorderColor(statusInfo),
          backgroundColor: getBackgroundColor(statusInfo),
        }}
      >
        <View
          className="absolute inset-0"
          style={{
            backgroundColor: getProgressColor(statusInfo),
            width: `${progressPercentage}%`,
          }}
        />
        <View className="absolute inset-0 px-3 py-2 flex-row items-center gap-2">
          {/* 左側: 絵文字とアクティビティ名 */}
          <View className="flex-row items-center gap-2 flex-shrink-0">
            {activity ? (
              <ActivityIcon
                activity={activity}
                size="medium"
                className="flex-shrink-0"
              />
            ) : (
              <Text className="text-2xl flex-shrink-0">{activityEmoji}</Text>
            )}
            <Text className="text-sm font-semibold truncate">
              {activityName}
            </Text>
          </View>

          {/* 中央: 進捗表示 */}
          <View className="flex-1 items-center justify-center">
            <View className="items-center">
              <Text className="text-sm font-bold">
                {goal.currentBalance > 0 ? "+" : ""}
                {goal.currentBalance.toLocaleString()}
                <Text className="text-xs">{quantityUnit}</Text>
              </Text>
              <Text className="text-xs text-gray-600">
                実績: {goal.totalActual.toLocaleString()} /{" "}
                {goal.totalTarget.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* 右側: ステータスと期間 */}
          <View className="flex-row items-center gap-2 flex-shrink-0">
            <View className="items-end">
              <View className="flex-row items-center gap-1">
                <Text className="text-xs font-medium">{statusInfo.label}</Text>
              </View>
              <Text className="text-xs text-gray-500 mt-1">
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
              </Text>
            </View>

            {isActive && (
              <View className="gap-0.5">
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    onEditStart();
                  }}
                  className="h-6 w-6 items-center justify-center"
                >
                  <Ionicons name="pencil" size={12} color="black" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="h-6 w-6 items-center justify-center"
                >
                  <Ionicons name="trash" size={12} color="#dc2626" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <GoalDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        goalId={goal.id}
      />
    </>
  );
};
