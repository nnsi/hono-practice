import { useState } from "react";

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
  type CreateActivityRequest,
  CreateActivityRequestSchema,
} from "@dtos/request/CreateActivityRequest";

import { Alert } from "../../utils/AlertWrapper";
import { apiClient } from "../../utils/apiClient";

export function NewActivityDialog({
  open,
  onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const form = useForm<CreateActivityRequest & { kinds: { name: string }[] }>({
    resolver: zodResolver(CreateActivityRequestSchema),
    defaultValues: {
      name: "",
      quantityUnit: "",
      emoji: "",
      showCombinedStats: false,
      kinds: [],
    },
  });

  const {
    fields: kindFields,
    append: kindAppend,
    remove: kindRemove,
  } = useFieldArray({
    control: form.control,
    name: "kinds",
  });

  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (
      data: CreateActivityRequest & { kinds: { name: string }[] },
    ) => {
      return apiClient.users.activities.$post({
        json: data,
      });
    },
    onSuccess: () => {
      Alert.alert("登録完了", "アクティビティを作成しました");
      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: () => {
      Alert.alert("エラー", "アクティビティの作成に失敗しました");
    },
  });

  const onSubmit = (
    data: CreateActivityRequest & { kinds: { name: string }[] },
  ) => {
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
            <Text className="text-lg font-semibold">
              アクティビティ新規作成
            </Text>
            <TouchableOpacity
              onPress={form.handleSubmit(onSubmit)}
              disabled={isPending}
            >
              <Text
                className={`text-base ${isPending ? "text-gray-400" : "text-blue-600"}`}
              >
                登録
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
                name="name"
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
                name="quantityUnit"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-gray-100 p-3 rounded-lg text-base"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="単位（例: 回, 分, km など）"
                  />
                )}
              />
            </View>

            <View>
              <Text className="text-sm text-gray-600 mb-1">絵文字</Text>
              <Controller
                control={form.control}
                name="emoji"
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
                name="showCombinedStats"
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
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
