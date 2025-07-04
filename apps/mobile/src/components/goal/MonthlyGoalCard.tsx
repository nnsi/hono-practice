import { useState } from "react";

import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { calculateMonthlyProgress } from "@packages/frontend-shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";

import { UpdateMonthlyGoalRequestSchema } from "@dtos/request";
import type { MonthlyTargetGoalResponse } from "@dtos/response";

import { apiClient } from "../../utils/apiClient";

import type { z } from "zod";

type MonthlyGoalCardProps = {
  goal: MonthlyTargetGoalResponse;
  activityName: string;
};

export const MonthlyGoalCard: React.FC<MonthlyGoalCardProps> = ({
  goal,
  activityName,
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const queryClient = useQueryClient();

  const remainingDays = dayjs(goal.targetMonth)
    .endOf("month")
    .diff(dayjs(), "day");

  const { progressPercentage, requiredDailyPace, isAchieved, status } =
    calculateMonthlyProgress(
      goal.currentQuantity,
      goal.targetQuantity,
      remainingDays,
    );

  const form = useForm<z.infer<typeof UpdateMonthlyGoalRequestSchema>>({
    resolver: zodResolver(UpdateMonthlyGoalRequestSchema),
    defaultValues: {
      targetMonth: goal.targetMonth,
      targetQuantity: goal.targetQuantity,
      description: goal.description || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (
      data: z.infer<typeof UpdateMonthlyGoalRequestSchema>,
    ) => {
      const res = await apiClient.users.goals.monthly_target[":id"].$put({
        param: { id: goal.id },
        json: data,
      });
      if (!res.ok) throw new Error("Failed to update goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setEditModalVisible(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.users.goals[":type"][":id"].$delete({
        param: { type: "monthly_target", id: goal.id },
      });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const onSubmit = (data: z.infer<typeof UpdateMonthlyGoalRequestSchema>) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    Alert.alert(
      "目標を削除",
      "この目標を削除しますか？この操作は取り消せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  };

  const getProgressColor = () => {
    switch (status) {
      case "achieved":
        return "#16a34a";
      case "high":
        return "#2563eb";
      case "moderate":
        return "#eab308";
      default:
        return "#dc2626";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "achieved":
        return "🏆";
      case "high":
        return "📊";
      case "moderate":
        return "⚡";
      default:
        return "⚠️";
    }
  };

  const formatMonth = (month: string) => dayjs(month).format("YYYY年MM月");

  return (
    <View
      className={`bg-white rounded-lg p-4 mb-3 border ${
        isAchieved ? "border-green-200" : "border-gray-200"
      }`}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold">
            {getStatusIcon()} {activityName}
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            {formatMonth(goal.targetMonth)}の目標
            {goal.description && (
              <Text className="text-gray-500"> • {goal.description}</Text>
            )}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text
            className="text-2xl font-bold mr-2"
            style={{ color: getProgressColor() }}
          >
            {Math.round(progressPercentage)}%
          </Text>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => setEditModalVisible(true)}
              className="p-2"
            >
              <Ionicons name="pencil" size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} className="p-2">
              <Ionicons name="trash-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View>
        <View className="flex-row justify-between mb-1">
          <Text className="text-sm text-gray-500">進捗</Text>
          <Text className="text-sm">
            {goal.currentQuantity} / {goal.targetQuantity}
          </Text>
        </View>
        <View className="bg-gray-200 rounded-full h-3 mb-3">
          <View
            className="h-3 rounded-full"
            style={{
              backgroundColor: getProgressColor(),
              width: `${Math.min(100, progressPercentage)}%`,
            }}
          />
        </View>
      </View>

      {!isAchieved && remainingDays > 0 && (
        <View className="flex-row justify-between">
          <View className="flex-1">
            <Text className="text-gray-500 text-sm">残り日数</Text>
            <Text className="text-sm font-medium mt-1">{remainingDays}日</Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-500 text-sm">必要な日割りペース</Text>
            <Text className="text-sm font-medium mt-1">
              {Math.ceil(requiredDailyPace)}/日
            </Text>
          </View>
        </View>
      )}

      {isAchieved && (
        <View className="bg-green-50 rounded-lg p-3">
          <Text className="text-green-600 font-semibold text-center">
            目標達成済み！
          </Text>
        </View>
      )}

      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 bg-gray-50">
          <View className="bg-white border-b border-gray-200 px-4 py-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-semibold">月間目標を編集</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="bg-white rounded-lg p-4">
              <View className="mb-4">
                <Text className="text-sm font-medium mb-2">対象月</Text>
                <Controller
                  control={form.control}
                  name="targetMonth"
                  render={({ field: { value } }) => (
                    <View className="border border-gray-300 rounded-lg px-3 py-2">
                      <Text>{formatMonth(value)}</Text>
                    </View>
                  )}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium mb-2">目標数</Text>
                <Controller
                  control={form.control}
                  name="targetQuantity"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      className="border border-gray-300 rounded-lg px-3 py-2"
                      value={value?.toString()}
                      onChangeText={(text) => onChange(Number(text))}
                      keyboardType="numeric"
                      placeholder="目標数"
                    />
                  )}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium mb-2">説明</Text>
                <Controller
                  control={form.control}
                  name="description"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      className="border border-gray-300 rounded-lg px-3 py-2"
                      value={value || ""}
                      onChangeText={onChange}
                      placeholder="説明"
                    />
                  )}
                />
              </View>

              <View className="flex-row justify-end gap-2 mt-6">
                <TouchableOpacity
                  onPress={() => setEditModalVisible(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <Text className="text-gray-700">キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={form.handleSubmit(onSubmit)}
                  className="px-4 py-2 bg-blue-500 rounded-lg"
                  disabled={updateMutation.isPending}
                >
                  <Text className="text-white">
                    {updateMutation.isPending ? "更新中..." : "更新"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};
