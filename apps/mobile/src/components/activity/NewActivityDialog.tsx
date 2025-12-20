import { useState } from "react";

import {
  type CreateActivityRequest,
  CreateActivityRequestSchema,
} from "@dtos/request/CreateActivityRequest";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Alert } from "../../utils/AlertWrapper";
import { apiClient } from "../../utils/apiClient";
import { getApiUrl } from "../../utils/getApiUrl";
import { resizeImage } from "../../utils/imageResizer";
import { IconTypeSelector } from "./IconTypeSelector";

export function NewActivityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [iconFile, setIconFile] = useState<{ uri: string } | undefined>();
  const [iconPreview, setIconPreview] = useState<string | undefined>();

  const form = useForm<CreateActivityRequest & { kinds: { name: string }[] }>({
    resolver: zodResolver(CreateActivityRequestSchema),
    defaultValues: {
      name: "",
      quantityUnit: "",
      emoji: "",
      iconType: "emoji",
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
      // Create activity first
      const response = await apiClient.users.activities.$post({
        json: data,
      });

      if (!response.ok) {
        throw new Error("Failed to create activity");
      }

      const activity = await response.json();

      // Upload icon if file is selected
      if (data.iconType === "upload" && iconFile) {
        try {
          // Resize image to 256x256 max and convert to base64
          const { base64, mimeType } = await resizeImage(
            iconFile.uri,
            256,
            256,
          );

          const API_URL = getApiUrl();

          const token = await apiClient.getAuthToken();
          const headers: HeadersInit = {
            "Content-Type": "application/json",
          };
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          const uploadResponse = await fetch(
            `${API_URL}users/activities/${activity.id}/icon`,
            {
              method: "POST",
              body: JSON.stringify({ base64, mimeType }),
              headers,
            },
          );

          if (!uploadResponse.ok) {
            throw new Error("Failed to upload icon");
          }
        } catch (error) {
          console.error("Failed to upload icon:", error);
          throw new Error("Failed to upload icon");
        }
      }

      return activity;
    },
    onSuccess: () => {
      Alert.alert("登録完了", "アクティビティを作成しました");
      onOpenChange(false);
      form.reset();
      setIconFile(undefined);
      setIconPreview(undefined);
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
              <Text className="text-sm text-gray-600 mb-1">アイコン</Text>
              <IconTypeSelector
                value={{
                  type: form.watch("iconType") || "emoji",
                  emoji: form.watch("emoji"),
                  file: iconFile,
                  preview: iconPreview,
                }}
                onChange={(value) => {
                  form.setValue("iconType", value.type);
                  if (value.type === "emoji") {
                    form.setValue("emoji", value.emoji || "");
                    setIconFile(undefined);
                    setIconPreview(undefined);
                  } else if (value.type === "upload") {
                    form.setValue("emoji", "📷"); // Default emoji for uploaded icons
                    setIconFile(value.file);
                    setIconPreview(value.preview);
                  }
                }}
                disabled={isPending}
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
