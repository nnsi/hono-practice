import { useState } from "react";

import {
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

import { useTimer } from "../../hooks/useTimer";
import { Alert } from "../../utils/AlertWrapper";
import { apiClient } from "../../utils/apiClient";

import { TimerControls } from "./TimerControls";
import { TimerDisplay } from "./TimerDisplay";

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
  const [activeTab, setActiveTab] = useState<"manual" | "timer">("manual");
  const timerEnabled = activity.unit === "seconds";

  const form = useForm<CreateActivityLogRequest>({
    resolver: zodResolver(CreateActivityLogRequestSchema),
    defaultValues: {
      date: dayjs(date).format("YYYY-MM-DD"),
      quantity: 0,
      activityKindId: undefined,
    },
  });

  const { isRunning, start, stop, reset, getFormattedTime, getElapsedSeconds } =
    useTimer(activity.id);

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
    },
    onError: () => {
      Alert.alert("エラー", "記録に失敗しました");
    },
  });

  const onSubmit = (data: CreateActivityLogRequest) => {
    mutate(data);
  };

  const handleTimerSave = () => {
    const seconds = getElapsedSeconds();
    mutate({
      date: dayjs(date).format("YYYY-MM-DD"),
      quantity: seconds,
      activityKindId: undefined,
    });
    reset();
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
          {timerEnabled && (
            <View className="flex-row justify-center mb-4">
              <TouchableOpacity
                onPress={() => setActiveTab("manual")}
                className={`px-4 py-2 mx-2 rounded-lg ${
                  activeTab === "manual" ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`font-medium ${
                    activeTab === "manual" ? "text-white" : "text-gray-700"
                  }`}
                >
                  手動入力
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("timer")}
                className={`px-4 py-2 mx-2 rounded-lg ${
                  activeTab === "timer" ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`font-medium ${
                    activeTab === "timer" ? "text-white" : "text-gray-700"
                  }`}
                >
                  タイマー
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="items-center py-8">
            <Text className="text-6xl mb-4">{activity.emoji}</Text>
            <Text className="text-2xl font-bold mb-8">{activity.name}</Text>

            {activeTab === "manual" ? (
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
            ) : (
              <View className="w-full max-w-xs">
                <View className="mb-8">
                  <TimerDisplay
                    time={getFormattedTime()}
                    isRunning={isRunning}
                  />
                </View>

                <View className="mb-8">
                  <TimerControls
                    isRunning={isRunning}
                    onStart={start}
                    onStop={stop}
                    onReset={reset}
                  />
                </View>

                {!isRunning && getElapsedSeconds() > 0 && (
                  <TouchableOpacity
                    className={`mt-8 py-4 px-8 rounded-full ${
                      isPending ? "bg-gray-300" : "bg-blue-600"
                    }`}
                    onPress={handleTimerSave}
                    disabled={isPending}
                  >
                    <Text className="text-white text-lg font-medium text-center">
                      {getElapsedSeconds()}秒を記録する
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
