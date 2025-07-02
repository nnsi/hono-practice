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
import { calculateDebtBalance } from "@packages/auth-core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";


import { UpdateDebtGoalRequestSchema } from "@dtos/request";
import type { DebtGoalResponse } from "@dtos/response";


import { apiClient } from "../../utils/apiClient";

import type { z } from "zod";

type DebtGoalCardProps = {
  goal: DebtGoalResponse;
  activityName: string;
};

export const DebtGoalCard: React.FC<DebtGoalCardProps> = ({
  goal,
  activityName,
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const queryClient = useQueryClient();

  const { balance, status } = calculateDebtBalance(
    goal.totalActual,
    goal.totalDebt,
  );
  const absBalance = Math.abs(goal.currentBalance);
  const daysCount = Math.ceil(absBalance / goal.dailyTargetQuantity);

  const form = useForm<z.infer<typeof UpdateDebtGoalRequestSchema>>({
    resolver: zodResolver(UpdateDebtGoalRequestSchema),
    defaultValues: {
      dailyTargetQuantity: goal.dailyTargetQuantity,
      startDate: goal.startDate,
      endDate: goal.endDate,
      description: goal.description || "",
      isActive: goal.isActive,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof UpdateDebtGoalRequestSchema>) => {
      const res = await apiClient.users.goals.debt[":id"].$put({
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
        param: { type: "debt", id: goal.id },
      });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const onSubmit = (data: z.infer<typeof UpdateDebtGoalRequestSchema>) => {
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

  const getStatusColor = () => {
    if (status === "debt") return "#dc2626";
    if (status === "savings") return "#16a34a";
    return "#6b7280";
  };

  const getStatusText = () => {
    if (status === "debt") return `${daysCount}日分の負債`;
    if (status === "savings") return `${daysCount}日分の貯金`;
    return "目標達成中";
  };

  const getStatusIcon = () => {
    if (status === "debt") return "📉";
    if (status === "savings") return "📈";
    return "✅";
  };

  const formatDate = (date: string) => dayjs(date).format("YYYY/MM/DD");

  const progressPercentage =
    goal.totalDebt > 0
      ? Math.min(100, (goal.totalActual / goal.totalDebt) * 100)
      : 0;

  return (
    <View
      className={`bg-white rounded-lg p-4 mb-3 border ${
        status === "debt"
          ? "border-red-200"
          : status === "savings"
            ? "border-green-200"
            : "border-gray-200"
      }`}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold">
            {getStatusIcon()} {activityName}
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            日次目標: {goal.dailyTargetQuantity}
            {goal.description && (
              <Text className="text-gray-500"> • {goal.description}</Text>
            )}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text
            className="font-semibold mr-2"
            style={{ color: getStatusColor() }}
          >
            {getStatusText()}
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

      <View className="flex-row justify-between mb-3">
        <View className="flex-1">
          <Text className="text-gray-500 text-sm">期間</Text>
          <Text className="text-sm mt-1">
            {formatDate(goal.startDate)} 〜{" "}
            {goal.endDate ? formatDate(goal.endDate) : "無期限"}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-gray-500 text-sm">累積実績 / 累積負債</Text>
          <Text className="text-sm mt-1">
            {goal.totalActual} / {goal.totalDebt}
          </Text>
        </View>
      </View>

      {goal.totalDebt > 0 && (
        <View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-gray-500">進捗</Text>
            <Text className="text-sm">{Math.round(progressPercentage)}%</Text>
          </View>
          <View className="bg-gray-200 rounded-full h-2">
            <View
              className={`h-2 rounded-full ${
                status === "debt" ? "bg-red-500" : "bg-green-500"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </View>
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
              <Text className="text-lg font-semibold">負債目標を編集</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="bg-white rounded-lg p-4">
              <View className="mb-4">
                <Text className="text-sm font-medium mb-2">日次目標</Text>
                <Controller
                  control={form.control}
                  name="dailyTargetQuantity"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      className="border border-gray-300 rounded-lg px-3 py-2"
                      value={value?.toString()}
                      onChangeText={(text) => onChange(Number(text))}
                      keyboardType="numeric"
                      placeholder="日次目標"
                    />
                  )}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium mb-2">開始日</Text>
                <Controller
                  control={form.control}
                  name="startDate"
                  render={({ field: { value } }) => (
                    <View className="border border-gray-300 rounded-lg px-3 py-2">
                      <Text>{formatDate(value)}</Text>
                    </View>
                  )}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium mb-2">終了日</Text>
                <Controller
                  control={form.control}
                  name="endDate"
                  render={({ field: { value } }) => (
                    <View className="border border-gray-300 rounded-lg px-3 py-2">
                      <Text>{value ? formatDate(value) : "無期限"}</Text>
                    </View>
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
