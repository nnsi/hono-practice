import React, { useCallback, useState } from "react";

import type {
  GetActivityLogResponse,
  GetActivityResponse,
} from "@dtos/response";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Alert } from "../../utils/AlertWrapper";
import { apiClient } from "../../utils/apiClient";

type ActivityLogEditDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  log: GetActivityLogResponse;
  activities: GetActivityResponse[];
};

export default React.memo(function ActivityLogEditDialog({
  isOpen,
  onClose,
  log,
  activities,
}: ActivityLogEditDialogProps) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(log.quantity?.toString() || "");
  const [memo, setMemo] = useState(log.memo || "");
  const [activityKindId, setActivityKindId] = useState(
    log.activityKind?.id || "",
  );

  const activity = activities.find((a) => a.id === log.activity.id);
  const dateStr = dayjs(log.date).format("YYYY-MM-DD");

  const updateMutation = useMutation({
    mutationFn: async () => {
      await apiClient.users["activity-logs"][":id"].$put({
        param: { id: log.id },
        json: {
          quantity: quantity ? Number(quantity) : undefined,
          memo: memo || undefined,
          activityKindId: activityKindId || undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-logs", dateStr] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.users["activity-logs"][":id"].$delete({
        param: { id: log.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-logs", dateStr] });
      onClose();
    },
  });

  const handleSave = useCallback(() => {
    updateMutation.mutate();
  }, [updateMutation]);

  const handleDelete = useCallback(() => {
    Alert.alert("活動ログの削除", "この活動ログを削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  }, [deleteMutation]);

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold">活動ログを編集</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="閉じる"
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View className="mb-6">
            <Text className="text-lg font-semibold mb-2">
              {log.activity.emoji} {log.activity.name}
            </Text>
            <Text className="text-gray-600">
              {dayjs(log.date).format("YYYY年MM月DD日")}
            </Text>
          </View>

          <View>
            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">数量</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2"
                placeholder={`${log.activity.quantityUnit}を入力`}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>

            {activity?.kinds && activity.kinds.length > 0 && (
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-2">種類</Text>
                {activity.kinds.map((kind) => (
                  <TouchableOpacity
                    key={kind.id}
                    className={`flex-row items-center p-3 rounded-lg border mb-2 ${
                      activityKindId === kind.id
                        ? "border-primary bg-primary/10"
                        : "border-gray-300"
                    }`}
                    onPress={() => setActivityKindId(kind.id)}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 mr-3 ${
                        activityKindId === kind.id
                          ? "border-primary bg-primary"
                          : "border-gray-400"
                      }`}
                    >
                      {activityKindId === kind.id && (
                        <View className="flex-1 m-0.5 bg-white rounded-full" />
                      )}
                    </View>
                    <Text>{kind.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">メモ</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2"
                placeholder="メモを入力"
                value={memo}
                onChangeText={setMemo}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View className="flex-row mt-6">
            <TouchableOpacity
              className="flex-1 bg-primary rounded-lg py-3 mr-2"
              onPress={handleSave}
            >
              <Text className="text-white text-center font-semibold">保存</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-danger rounded-lg px-6 py-3"
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel="活動ログを削除"
            >
              <Text className="text-white font-semibold">削除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});
