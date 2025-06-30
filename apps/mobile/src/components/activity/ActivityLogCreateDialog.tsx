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

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";

import {
  type CreateActivityLogRequest,
  CreateActivityLogRequestSchema,
} from "@dtos/request/CreateActivityLogRequest";
import type { GetActivityResponse } from "@dtos/response";

import { apiClient } from "../../utils/apiClient";

export function ActivityLogCreateDialog({
  open,
  onOpenChange,
  activity,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: GetActivityResponse;
  date: Date;
}) {
  const form = useForm<CreateActivityLogRequest>({
    resolver: zodResolver(CreateActivityLogRequestSchema),
    defaultValues: {
      date: dayjs(date).format("YYYY-MM-DD"),
      quantity: 0,
      activityKindId: undefined,
    },
  });

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: CreateActivityLogRequest) => {
      return apiClient.users["activity-logs"].$post({
        json: {
          ...data,
          activityId: activity.id,
        },
      });
    },
    onSuccess: () => {
      Alert.alert("記録完了", "アクティビティを記録しました");
      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({
        queryKey: [
          "activity",
          "activity-logs-daily",
          dayjs(date).format("YYYY-MM-DD"),
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["activity-logs", dayjs(date).format("YYYY-MM-DD")],
      });
    },
    onError: () => {
      Alert.alert("エラー", "記録に失敗しました");
    },
  });

  const onSubmit = (data: CreateActivityLogRequest) => {
    mutate(data);
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => onOpenChange(false)}
    >
      <View className="flex-1 bg-white">
        <View className="bg-white border-b border-gray-200 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => onOpenChange(false)}>
              <Text className="text-blue-600 text-base">キャンセル</Text>
            </TouchableOpacity>
            <View className="flex-row items-center">
              <Text className="text-2xl mr-2">{activity.emoji}</Text>
              <Text className="text-lg font-semibold">{activity.name}</Text>
            </View>
            <TouchableOpacity
              onPress={form.handleSubmit(onSubmit)}
              disabled={isPending}
            >
              <Text
                className={`text-base ${isPending ? "text-gray-400" : "text-blue-600"}`}
              >
                記録
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          <View className="items-center py-8">
            <Text className="text-6xl mb-4">{activity.emoji}</Text>
            <Text className="text-2xl font-bold mb-8">{activity.name}</Text>

            <View className="w-full max-w-xs">
              <Controller
                control={form.control}
                name="quantity"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="flex-row items-center justify-center">
                    <TextInput
                      className="bg-gray-100 p-4 rounded-lg text-3xl text-center w-32"
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        const num = Number.parseFloat(text) || 0;
                        onChange(num);
                      }}
                      value={value?.toString() || "0"}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                    <Text className="text-2xl ml-3">
                      {activity.quantityUnit}
                    </Text>
                  </View>
                )}
              />

              {activity.kinds && activity.kinds.length > 0 && (
                <View className="mt-8">
                  <Text className="text-base font-medium mb-3 text-center">
                    種類を選択
                  </Text>
                  <Controller
                    control={form.control}
                    name="activityKindId"
                    render={({ field: { onChange, value } }) => (
                      <View className="space-y-2">
                        {activity.kinds.map((kind) => (
                          <TouchableOpacity
                            key={kind.id}
                            className={`p-4 rounded-lg border ${
                              value === kind.id
                                ? "bg-blue-100 border-blue-500"
                                : "bg-gray-50 border-gray-200"
                            }`}
                            onPress={() => onChange(kind.id)}
                          >
                            <Text
                              className={`text-center ${
                                value === kind.id
                                  ? "text-blue-700 font-medium"
                                  : "text-gray-700"
                              }`}
                            >
                              {kind.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  />
                </View>
              )}

              <TouchableOpacity
                className={`mt-12 py-4 px-8 rounded-full ${
                  isPending ? "bg-gray-300" : "bg-blue-600"
                }`}
                onPress={form.handleSubmit(onSubmit)}
                disabled={isPending}
              >
                <Text className="text-white text-lg font-medium text-center">
                  記録する！
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
