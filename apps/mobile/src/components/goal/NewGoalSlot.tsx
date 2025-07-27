import type React from "react";
import { useState } from "react";

import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";


import { Ionicons } from "@expo/vector-icons";
import { Controller, useForm } from "react-hook-form";
import DatePicker from "react-native-date-picker";

import type { GetActivityResponse } from "@dtos/response";

import { useCreateGoal } from "../../hooks/useGoals";
import { Alert } from "../../utils/AlertWrapper";

type FormData = {
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate?: string;
};

type NewGoalSlotProps = {
  activities: GetActivityResponse[];
  onCreated: () => void;
};

export const NewGoalSlot: React.FC<NewGoalSlotProps> = ({
  activities,
  onCreated,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      dailyTargetQuantity: 1,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    },
  });

  const createGoal = useCreateGoal();

  // 選択された活動の単位を取得
  const selectedActivityId = form.watch("activityId");
  const selectedActivity = activities.find((a) => a.id === selectedActivityId);
  const quantityUnit = selectedActivity?.quantityUnit || "";

  const handleSubmit = (data: FormData) => {
    const quantity = data.dailyTargetQuantity;
    if (!quantity || quantity <= 0) {
      Alert.alert("エラー", "日次目標は1以上の数値を入力してください。");
      return;
    }

    if (!data.activityId) {
      Alert.alert("エラー", "活動を選択してください。");
      return;
    }

    createGoal.mutate(
      {
        activityId: data.activityId,
        dailyTargetQuantity: Number(quantity),
        startDate: data.startDate,
        endDate: data.endDate || undefined,
      },
      {
        onSuccess: () => {
          setIsCreating(false);
          form.reset();
          onCreated();
        },
        onError: () => {
          Alert.alert("エラー", "目標の作成に失敗しました。");
        },
      },
    );
  };

  if (!isCreating) {
    return (
      <TouchableOpacity
        onPress={() => setIsCreating(true)}
        className="w-full h-20 rounded-lg border-2 border-dashed border-gray-300 bg-white items-center justify-center flex-row gap-2"
      >
        <Ionicons name="add" size={20} color="#9ca3af" />
        <Text className="text-sm text-gray-500">新規目標を追加</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="w-full rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
      <View className="gap-3">
        {/* Activity Selector */}
        <TouchableOpacity
          onPress={() => setShowActivityPicker(true)}
          className="h-10 border border-gray-300 rounded bg-white px-3 justify-center"
        >
          {selectedActivity ? (
            <Text>
              {selectedActivity.emoji} {selectedActivity.name}
            </Text>
          ) : (
            <Text className="text-gray-500">活動を選択</Text>
          )}
        </TouchableOpacity>

        {/* Form Inputs */}
        <View className="gap-2">
          <View className="flex-row items-center gap-1">
            <Text className="text-sm text-gray-600">日次目標:</Text>
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
                  className="h-10 w-28 text-center border border-gray-300 rounded bg-white"
                />
              )}
            />
            {quantityUnit && (
              <Text className="text-sm text-gray-600">{quantityUnit}</Text>
            )}
          </View>

          <View className="flex-row gap-2">
            <Controller
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <TouchableOpacity
                  onPress={() => setShowStartDatePicker(true)}
                  className="h-10 w-32 border border-gray-300 rounded bg-white px-3 justify-center"
                >
                  <Text>{field.value}</Text>
                </TouchableOpacity>
              )}
            />

            <Controller
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <TouchableOpacity
                  onPress={() => setShowEndDatePicker(true)}
                  className="h-10 w-32 border border-gray-300 rounded bg-white px-3 justify-center"
                >
                  <Text className={field.value ? "" : "text-gray-500"}>
                    {field.value || "終了日（任意）"}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>

        {/* Buttons */}
        <View className="flex-row gap-2 justify-end">
          <TouchableOpacity
            onPress={form.handleSubmit(handleSubmit)}
            disabled={createGoal.isPending}
            className="h-10 px-4 bg-primary rounded justify-center"
          >
            <Text className="text-white font-medium">作成</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setIsCreating(false);
              form.reset();
            }}
            className="h-10 px-4 bg-white border border-gray-300 rounded justify-center"
          >
            <Text className="text-black font-medium">取消</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Activity Picker Modal */}
      <Modal
        visible={showActivityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActivityPicker(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl">
            <View className="p-4">
              <Text className="text-lg font-bold mb-4">活動を選択</Text>
              {activities.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  onPress={() => {
                    form.setValue("activityId", activity.id);
                    setShowActivityPicker(false);
                  }}
                  className="flex-row items-center gap-3 py-3 border-b border-gray-100"
                >
                  <Text className="text-2xl">{activity.emoji}</Text>
                  <Text className="text-base">{activity.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setShowActivityPicker(false)}
                className="mt-4 py-3 items-center"
              >
                <Text className="text-gray-600">キャンセル</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      <Controller
        control={form.control}
        name="startDate"
        render={({ field }) => (
          <DatePicker
            modal
            open={showStartDatePicker}
            date={field.value ? new Date(field.value) : new Date()}
            mode="date"
            locale="ja"
            title="開始日を選択"
            confirmText="決定"
            cancelText="キャンセル"
            onConfirm={(date) => {
              field.onChange(date.toISOString().split("T")[0]);
              setShowStartDatePicker(false);
            }}
            onCancel={() => {
              setShowStartDatePicker(false);
            }}
          />
        )}
      />

      <Controller
        control={form.control}
        name="endDate"
        render={({ field }) => (
          <DatePicker
            modal
            open={showEndDatePicker}
            date={field.value ? new Date(field.value) : new Date()}
            mode="date"
            locale="ja"
            title="終了日を選択"
            confirmText="決定"
            cancelText="キャンセル"
            onConfirm={(date) => {
              field.onChange(date.toISOString().split("T")[0]);
              setShowEndDatePicker(false);
            }}
            onCancel={() => {
              setShowEndDatePicker(false);
            }}
          />
        )}
      />
    </View>
  );
};
