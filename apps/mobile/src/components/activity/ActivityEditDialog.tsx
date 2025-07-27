import { useEffect } from "react";

import {
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";


import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import {
  type UpdateActivityRequest,
  UpdateActivityRequestSchema,
} from "@dtos/request/UpdateActivityRequest";
import type { GetActivityResponse } from "@dtos/response";

import { Alert } from "../../utils/AlertWrapper";
import { apiClient } from "../../utils/apiClient";

export const ActivityEditDialog = ({
  open,
  onClose,
  activity,
}: {
  open: boolean;
  onClose: () => void;
  activity: GetActivityResponse | null;
}) => {
  const queryClient = useQueryClient();
  const form = useForm<UpdateActivityRequest>({
    resolver: zodResolver(UpdateActivityRequestSchema),
    defaultValues: activity
      ? {
          activity: {
            name: activity.name,
            description: activity.description ?? "",
            quantityUnit: activity.quantityUnit,
            emoji: activity.emoji ?? "",
            showCombinedStats: activity.showCombinedStats ?? false,
          },
          kinds: activity.kinds.map((kind) => ({
            id: kind.id,
            name: kind.name,
          })),
        }
      : undefined,
  });

  const {
    fields: kindFields,
    append: kindAppend,
    remove: kindRemove,
  } = useFieldArray({
    control: form.control,
    name: "kinds",
  });

  useEffect(() => {
    if (activity && open) {
      form.reset({
        activity: {
          name: activity.name,
          description: activity.description ?? "",
          quantityUnit: activity.quantityUnit,
          emoji: activity.emoji ?? "",
          showCombinedStats: activity.showCombinedStats ?? false,
        },
        kinds: activity.kinds.map((kind) => ({
          id: kind.id,
          name: kind.name,
        })),
      });
    }
  }, [activity, form, open]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: UpdateActivityRequest) => {
      if (!activity) return;
      return apiClient.users.activities[":id"].$put({
        param: { id: activity.id },
        json: data,
      });
    },
    onSuccess: () => {
      Alert.alert("更新完了", "アクティビティを更新しました");
      onClose();
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: () => {
      Alert.alert("エラー", "アクティビティの更新に失敗しました");
    },
  });

  const handleDelete = async () => {
    Alert.alert(
      "削除確認",
      "このアクティビティを削除しますか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            if (!activity) return;
            try {
              await apiClient.users.activities[":id"].$delete({
                param: { id: activity.id },
              });
              Alert.alert("削除完了", "アクティビティを削除しました");
              onClose();
              queryClient.invalidateQueries({ queryKey: ["activity"] });
            } catch (error) {
              Alert.alert("エラー", "アクティビティの削除に失敗しました");
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const onSubmit = (data: UpdateActivityRequest) => {
    mutate(data);
  };

  if (!activity) return null;

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <View className="bg-white border-b border-gray-200 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-blue-600 text-base">キャンセル</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold">アクティビティ編集</Text>
            <TouchableOpacity
              onPress={form.handleSubmit(onSubmit)}
              disabled={isPending}
            >
              <Text
                className={`text-base ${isPending ? "text-gray-400" : "text-blue-600"}`}
              >
                更新
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          <View className="space-y-4">
            <View>
              <Text className="text-sm text-gray-600 mb-1">名前</Text>
              <Controller
                control={form.control}
                name="activity.name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-gray-100 p-3 rounded-lg text-base"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="名前"
                  />
                )}
              />
            </View>

            <View>
              <Text className="text-sm text-gray-600 mb-1">単位</Text>
              <Controller
                control={form.control}
                name="activity.quantityUnit"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-gray-100 p-3 rounded-lg text-base"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="単位"
                  />
                )}
              />
            </View>

            <View>
              <Text className="text-sm text-gray-600 mb-1">絵文字</Text>
              <Controller
                control={form.control}
                name="activity.emoji"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-gray-100 p-3 rounded-lg text-base text-center w-20"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="🏃"
                  />
                )}
              />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-base">合算統計を表示</Text>
              <Controller
                control={form.control}
                name="activity.showCombinedStats"
                render={({ field: { onChange, value } }) => (
                  <Switch onValueChange={onChange} value={value} />
                )}
              />
            </View>

            <View>
              <Text className="text-base font-semibold mb-2">
                種類（kinds）
              </Text>
              {kindFields.map((field, index) => (
                <View key={field.id} className="flex-row items-center mb-2">
                  <Controller
                    control={form.control}
                    name={`kinds.${index}.name`}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className="bg-gray-100 p-3 rounded-lg text-base flex-1"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholder="種類名"
                      />
                    )}
                  />
                  <TouchableOpacity
                    className="ml-2 p-3"
                    onPress={() => kindRemove(index)}
                  >
                    <Ionicons
                      name="remove-circle-outline"
                      size={24}
                      color="#ef4444"
                    />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                className="bg-gray-100 p-3 rounded-lg flex-row items-center justify-center mt-2"
                onPress={() => kindAppend({ name: "" })}
              >
                <Ionicons name="add-circle-outline" size={20} color="#6b7280" />
                <Text className="text-gray-600 ml-2">種類を追加</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="bg-red-50 border border-red-200 p-4 rounded-lg mt-8"
              onPress={handleDelete}
            >
              <Text className="text-red-600 text-center font-medium">
                アクティビティを削除
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};
