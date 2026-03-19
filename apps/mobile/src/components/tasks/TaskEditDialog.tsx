import dayjs from "dayjs";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { useLiveQuery } from "../../db/useLiveQuery";
import { useActivities } from "../../hooks/useActivities";
import { activityRepository } from "../../repositories/activityRepository";
import { DatePickerField } from "../common/DatePickerField";
import { IMESafeTextInput } from "../common/IMESafeTextInput";
import { ModalOverlay } from "../common/ModalOverlay";
import type { TaskItem } from "./types";
import { useTaskEditDialog } from "./useTaskEditDialog";

export function TaskEditDialog({
  task,
  onClose,
  onSuccess,
  onDelete,
}: {
  task: TaskItem;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: (id: string) => void;
}) {
  const {
    title,
    setTitle,
    activityId,
    setActivityId,
    activityKindId,
    setActivityKindId,
    quantity,
    setQuantity,
    startDate,
    setStartDate,
    dueDate,
    setDueDate,
    memo,
    setMemo,
    isSubmitting,
    isArchived,
    handleSave,
  } = useTaskEditDialog(task, onSuccess);

  const { activities } = useActivities();

  const kinds = useLiveQuery(
    "activity_kinds",
    () =>
      activityId
        ? activityRepository.getActivityKindsByActivityId(activityId)
        : Promise.resolve([]),
    [activityId],
  );
  const activeKinds = (kinds ?? []).filter((k) => !k.deletedAt);

  const selectedActivity = activityId
    ? activities.find((a) => a.id === activityId)
    : null;

  const handleSetActivityId = (id: string | null) => {
    setActivityId(id);
    setActivityKindId(null);
    setQuantity(null);
  };

  return (
    <ModalOverlay
      visible
      onClose={onClose}
      title="タスクを編集"
      footer={
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => onDelete(task.id)}
            className="px-4 py-2.5 border border-red-300 rounded-lg items-center"
          >
            <Text className="text-sm text-red-600">削除</Text>
          </TouchableOpacity>
          <View className="flex-1" />
          <TouchableOpacity
            onPress={onClose}
            className="px-4 py-2.5 border border-gray-300 rounded-lg items-center"
          >
            <Text className="text-sm text-gray-700">キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSubmitting || !title.trim()}
            className={`px-4 py-2.5 rounded-lg items-center ${
              isSubmitting || !title.trim() ? "bg-blue-300" : "bg-blue-600"
            }`}
          >
            <Text className="text-sm text-white font-medium">
              {isSubmitting ? "更新中..." : "更新"}
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View className="gap-4 pb-4">
        {isArchived && (
          <Text className="text-xs text-gray-500">
            アーカイブ済みタスクはメモの編集と削除のみ可能です
          </Text>
        )}

        {/* Title */}
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">
            タイトル
          </Text>
          <IMESafeTextInput
            value={title}
            onChangeText={setTitle}
            placeholder="タスクのタイトル"
            editable={!isArchived}
            className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${
              isArchived ? "bg-gray-100 text-gray-500" : ""
            }`}
          />
        </View>

        {/* Activity */}
        {activities.length > 0 && (
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">
              アクティビティ（任意）
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
            >
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => !isArchived && handleSetActivityId(null)}
                  disabled={isArchived}
                  className={`px-3 py-1.5 rounded-full border ${
                    activityId === null
                      ? "bg-gray-900 border-gray-900"
                      : "bg-white border-gray-300"
                  } ${isArchived ? "opacity-50" : ""}`}
                >
                  <Text
                    className={`text-sm ${
                      activityId === null
                        ? "text-white font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    なし
                  </Text>
                </TouchableOpacity>
                {activities.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() =>
                      !isArchived &&
                      handleSetActivityId(activityId === a.id ? null : a.id)
                    }
                    disabled={isArchived}
                    className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                      activityId === a.id
                        ? "bg-gray-900 border-gray-900"
                        : "bg-white border-gray-300"
                    } ${isArchived ? "opacity-50" : ""}`}
                  >
                    <Text
                      className={`text-sm ${
                        activityId === a.id
                          ? "text-white font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      {a.emoji ? `${a.emoji} ` : ""}
                      {a.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ActivityKind */}
        {activityId && activeKinds.length > 0 && (
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">
              種類（任意）
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
            >
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => !isArchived && setActivityKindId(null)}
                  disabled={isArchived}
                  className={`px-3 py-1.5 rounded-full border ${
                    activityKindId === null
                      ? "bg-gray-900 border-gray-900"
                      : "bg-white border-gray-300"
                  } ${isArchived ? "opacity-50" : ""}`}
                >
                  <Text
                    className={`text-sm ${
                      activityKindId === null
                        ? "text-white font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    なし
                  </Text>
                </TouchableOpacity>
                {activeKinds.map((k) => (
                  <TouchableOpacity
                    key={k.id}
                    onPress={() =>
                      !isArchived &&
                      setActivityKindId(activityKindId === k.id ? null : k.id)
                    }
                    disabled={isArchived}
                    className={`px-3 py-1.5 rounded-full border ${
                      activityKindId === k.id
                        ? "bg-gray-900 border-gray-900"
                        : "bg-white border-gray-300"
                    } ${isArchived ? "opacity-50" : ""}`}
                  >
                    <Text
                      className={`text-sm ${
                        activityKindId === k.id
                          ? "text-white font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      {k.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Quantity */}
        {activityId && (
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">
              数量（任意）
              {selectedActivity?.quantityUnit
                ? `（${selectedActivity.quantityUnit}）`
                : ""}
            </Text>
            <IMESafeTextInput
              value={quantity !== null ? String(quantity) : ""}
              onChangeText={(v) => {
                const parsed = parseFloat(v);
                setQuantity(
                  v === "" ? null : Number.isNaN(parsed) ? null : parsed,
                );
              }}
              placeholder="数量を入力"
              keyboardType="decimal-pad"
              editable={!isArchived}
              className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${
                isArchived ? "bg-gray-100 text-gray-500" : ""
              }`}
            />
          </View>
        )}

        {/* Dates */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            {isArchived ? (
              <View>
                <Text className="text-sm text-gray-500 mb-1">開始日</Text>
                <Text className="text-sm text-gray-400 px-3 py-2">
                  {startDate ? dayjs(startDate).format("YYYY/MM/DD") : "未設定"}
                </Text>
              </View>
            ) : (
              <DatePickerField
                value={startDate || dayjs().format("YYYY-MM-DD")}
                onChange={setStartDate}
                label="開始日"
              />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-sm text-gray-500 mb-1">期限（任意）</Text>
            <IMESafeTextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              editable={!isArchived}
              className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${
                isArchived ? "bg-gray-100 text-gray-500" : ""
              }`}
            />
          </View>
        </View>

        {/* Memo */}
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">
            メモ（任意）
          </Text>
          <IMESafeTextInput
            value={memo}
            onChangeText={setMemo}
            placeholder="タスクに関するメモ"
            multiline
            numberOfLines={3}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            style={{ textAlignVertical: "top" }}
          />
        </View>
      </View>
    </ModalOverlay>
  );
}
