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
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";

import {
  type CreateDebtGoalRequest,
  CreateDebtGoalRequestSchema,
  type CreateMonthlyGoalRequest,
  CreateMonthlyGoalRequestSchema,
} from "@dtos/request";
import type { GetActivityResponse } from "@dtos/response";

import { useCreateDebtGoal, useCreateMonthlyGoal } from "../../hooks";

type GoalCreateDialogProps = {
  visible: boolean;
  onClose: () => void;
  activities: GetActivityResponse[];
};

export const GoalCreateDialog: React.FC<GoalCreateDialogProps> = ({
  visible,
  onClose,
  activities,
}) => {
  const [goalType, setGoalType] = useState<"debt" | "monthly">("debt");
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"debt" | "monthly">("debt");

  const debtForm = useForm<CreateDebtGoalRequest>({
    resolver: zodResolver(CreateDebtGoalRequestSchema),
    defaultValues: {
      activityId: "",
      dailyTargetQuantity: undefined as any,
      startDate: dayjs().format("YYYY-MM-DD"),
      endDate: undefined,
      description: "",
    },
  });

  const monthlyForm = useForm<CreateMonthlyGoalRequest>({
    resolver: zodResolver(CreateMonthlyGoalRequestSchema),
    defaultValues: {
      activityId: "",
      targetQuantity: undefined as any,
      targetMonth: dayjs().format("YYYY-MM"),
      description: "",
    },
  });

  const createDebtGoal = useCreateDebtGoal();
  const createMonthlyGoal = useCreateMonthlyGoal();

  const handleDebtSubmit = (data: CreateDebtGoalRequest) => {
    createDebtGoal.mutate(
      {
        ...data,
        dailyTargetQuantity: data.dailyTargetQuantity || 1,
      },
      {
        onSuccess: () => {
          Alert.alert("成功", "負債目標を作成しました");
          debtForm.reset();
          onClose();
        },
        onError: () => {
          Alert.alert("エラー", "負債目標の作成に失敗しました");
        },
      },
    );
  };

  const handleMonthlySubmit = (data: CreateMonthlyGoalRequest) => {
    createMonthlyGoal.mutate(
      {
        ...data,
        targetQuantity: data.targetQuantity || 1,
      },
      {
        onSuccess: () => {
          Alert.alert("成功", "月間目標を作成しました");
          monthlyForm.reset();
          onClose();
        },
        onError: () => {
          Alert.alert("エラー", "月間目標の作成に失敗しました");
        },
      },
    );
  };

  const handleClose = () => {
    debtForm.reset();
    monthlyForm.reset();
    onClose();
  };

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50">
      <TouchableOpacity
        className="absolute inset-0 bg-black/50"
        activeOpacity={1}
        onPress={handleClose}
      />
      <View className="flex-1 justify-end">
        <View className="bg-gray-50 rounded-t-3xl" style={{ minHeight: "90%" }}>
          <View className="bg-white border-b border-gray-200 px-4 py-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-semibold">新規目標作成</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1">
            <View className="bg-white m-4 rounded-lg p-4">
              <View className="flex-row mb-4">
                <TouchableOpacity
                  onPress={() => setGoalType("debt")}
                  className={`flex-1 py-3 rounded-l-lg border ${
                    goalType === "debt"
                      ? "bg-blue-500 border-blue-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={`text-center font-medium ${
                      goalType === "debt" ? "text-white" : "text-gray-700"
                    }`}
                  >
                    負債目標
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setGoalType("monthly")}
                  className={`flex-1 py-3 rounded-r-lg border border-l-0 ${
                    goalType === "monthly"
                      ? "bg-blue-500 border-blue-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={`text-center font-medium ${
                      goalType === "monthly" ? "text-white" : "text-gray-700"
                    }`}
                  >
                    月間目標
                  </Text>
                </TouchableOpacity>
              </View>

              {goalType === "debt" ? (
                <View>
                  <View className="mb-4">
                    <Text className="text-sm font-medium mb-2">
                      アクティビティ
                    </Text>
                    <Controller
                      control={debtForm.control}
                      name="activityId"
                      render={({ field: { onChange, value } }) => {
                        const selectedActivity = activities.find(
                          (a) => a.id === value,
                        );
                        return (
                          <TouchableOpacity
                            className="border border-gray-300 rounded-lg px-3 py-3"
                            onPress={() => {
                              setPickerMode("debt");
                              setShowActivityPicker(true);
                            }}
                          >
                            <Text
                              className={
                                selectedActivity
                                  ? "text-gray-900"
                                  : "text-gray-400"
                              }
                            >
                              {selectedActivity
                                ? `${selectedActivity.emoji} ${selectedActivity.name}`
                                : "アクティビティを選択"}
                            </Text>
                          </TouchableOpacity>
                        );
                      }}
                    />
                    {debtForm.formState.errors.activityId && (
                      <Text className="text-red-500 text-sm mt-1">
                        {debtForm.formState.errors.activityId.message}
                      </Text>
                    )}
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium mb-2">日次目標量</Text>
                    <Controller
                      control={debtForm.control}
                      name="dailyTargetQuantity"
                      render={({ field: { onChange, value } }) => (
                        <TextInput
                          className="border border-gray-300 rounded-lg px-3 py-2"
                          value={value?.toString() || ""}
                          onChangeText={(text) =>
                            onChange(text === "" ? undefined : Number(text))
                          }
                          keyboardType="numeric"
                          placeholder="例: 10"
                        />
                      )}
                    />
                    {debtForm.formState.errors.dailyTargetQuantity && (
                      <Text className="text-red-500 text-sm mt-1">
                        {debtForm.formState.errors.dailyTargetQuantity.message}
                      </Text>
                    )}
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium mb-2">開始日</Text>
                    <Controller
                      control={debtForm.control}
                      name="startDate"
                      render={({ field: { value } }) => (
                        <View className="border border-gray-300 rounded-lg px-3 py-2">
                          <Text>{dayjs(value).format("YYYY/MM/DD")}</Text>
                        </View>
                      )}
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium mb-2">
                      終了日（オプション）
                    </Text>
                    <Controller
                      control={debtForm.control}
                      name="endDate"
                      render={({ field: { value } }) => (
                        <View className="border border-gray-300 rounded-lg px-3 py-2">
                          <Text>
                            {value
                              ? dayjs(value).format("YYYY/MM/DD")
                              : "無期限"}
                          </Text>
                        </View>
                      )}
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium mb-2">
                      説明（オプション）
                    </Text>
                    <Controller
                      control={debtForm.control}
                      name="description"
                      render={({ field: { onChange, value } }) => (
                        <TextInput
                          className="border border-gray-300 rounded-lg px-3 py-2"
                          value={value || ""}
                          onChangeText={onChange}
                          placeholder="目標の説明を入力"
                        />
                      )}
                    />
                  </View>

                  <View className="flex-row justify-end gap-2 mt-6">
                    <TouchableOpacity
                      onPress={handleClose}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <Text className="text-gray-700">キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={debtForm.handleSubmit(handleDebtSubmit)}
                      className="px-4 py-2 bg-blue-500 rounded-lg"
                      disabled={createDebtGoal.isPending}
                    >
                      <Text className="text-white">作成</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <View className="mb-4">
                    <Text className="text-sm font-medium mb-2">
                      アクティビティ
                    </Text>
                    <Controller
                      control={monthlyForm.control}
                      name="activityId"
                      render={({ field: { onChange, value } }) => {
                        const selectedActivity = activities.find(
                          (a) => a.id === value,
                        );
                        return (
                          <TouchableOpacity
                            className="border border-gray-300 rounded-lg px-3 py-3"
                            onPress={() => {
                              setPickerMode("monthly");
                              setShowActivityPicker(true);
                            }}
                          >
                            <Text
                              className={
                                selectedActivity
                                  ? "text-gray-900"
                                  : "text-gray-400"
                              }
                            >
                              {selectedActivity
                                ? `${selectedActivity.emoji} ${selectedActivity.name}`
                                : "アクティビティを選択"}
                            </Text>
                          </TouchableOpacity>
                        );
                      }}
                    />
                    {monthlyForm.formState.errors.activityId && (
                      <Text className="text-red-500 text-sm mt-1">
                        {monthlyForm.formState.errors.activityId.message}
                      </Text>
                    )}
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium mb-2">目標量</Text>
                    <Controller
                      control={monthlyForm.control}
                      name="targetQuantity"
                      render={({ field: { onChange, value } }) => (
                        <TextInput
                          className="border border-gray-300 rounded-lg px-3 py-2"
                          value={value?.toString() || ""}
                          onChangeText={(text) =>
                            onChange(text === "" ? undefined : Number(text))
                          }
                          keyboardType="numeric"
                          placeholder="例: 300"
                        />
                      )}
                    />
                    {monthlyForm.formState.errors.targetQuantity && (
                      <Text className="text-red-500 text-sm mt-1">
                        {monthlyForm.formState.errors.targetQuantity.message}
                      </Text>
                    )}
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium mb-2">対象月</Text>
                    <Controller
                      control={monthlyForm.control}
                      name="targetMonth"
                      render={({ field: { value } }) => (
                        <View className="border border-gray-300 rounded-lg px-3 py-2">
                          <Text>{dayjs(value).format("YYYY年MM月")}</Text>
                        </View>
                      )}
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium mb-2">
                      説明（オプション）
                    </Text>
                    <Controller
                      control={monthlyForm.control}
                      name="description"
                      render={({ field: { onChange, value } }) => (
                        <TextInput
                          className="border border-gray-300 rounded-lg px-3 py-2"
                          value={value || ""}
                          onChangeText={onChange}
                          placeholder="目標の説明を入力"
                        />
                      )}
                    />
                  </View>

                  <View className="flex-row justify-end gap-2 mt-6">
                    <TouchableOpacity
                      onPress={handleClose}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <Text className="text-gray-700">キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={monthlyForm.handleSubmit(handleMonthlySubmit)}
                      className="px-4 py-2 bg-blue-500 rounded-lg"
                      disabled={createMonthlyGoal.isPending}
                    >
                      <Text className="text-white">作成</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Activity Picker */}
      {showActivityPicker && (
        <View className="absolute inset-0 z-50">
          <TouchableOpacity
            className="absolute inset-0 bg-black/50"
            activeOpacity={1}
            onPress={() => setShowActivityPicker(false)}
          />
          <View className="flex-1 justify-end">
            <View
              className="bg-gray-50 rounded-t-3xl"
              style={{ minHeight: "80%" }}
            >
              <View className="bg-white border-b border-gray-200 px-4 py-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-lg font-semibold">
                    アクティビティを選択
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowActivityPicker(false)}
                  >
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView className="flex-1">
                {activities.map((activity) => (
                  <TouchableOpacity
                    key={activity.id}
                    className="bg-white border-b border-gray-200 px-4 py-3"
                    onPress={() => {
                      if (pickerMode === "debt") {
                        debtForm.setValue("activityId", activity.id);
                      } else {
                        monthlyForm.setValue("activityId", activity.id);
                      }
                      setShowActivityPicker(false);
                    }}
                  >
                    <Text className="text-lg">
                      {activity.emoji} {activity.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};
