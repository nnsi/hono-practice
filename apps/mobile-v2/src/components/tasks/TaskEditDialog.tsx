import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { ModalOverlay } from "../common/ModalOverlay";
import { DatePickerField } from "../common/DatePickerField";
import { useTaskEditDialog } from "./useTaskEditDialog";
import type { TaskItem } from "./types";
import dayjs from "dayjs";

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

  return (
    <ModalOverlay visible onClose={onClose} title="タスクを編集">
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
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="タスクのタイトル"
            editable={!isArchived}
            className={`border border-gray-300 rounded-lg px-3 py-2 text-sm ${
              isArchived ? "bg-gray-100 text-gray-500" : ""
            }`}
          />
        </View>

        {/* Dates */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            {isArchived ? (
              <View>
                <Text className="text-sm text-gray-500 mb-1">開始日</Text>
                <Text className="text-sm text-gray-400 px-3 py-2">
                  {startDate
                    ? dayjs(startDate).format("YYYY/MM/DD")
                    : "未設定"}
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
            <TextInput
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
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder="タスクに関するメモ"
            multiline
            numberOfLines={3}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            style={{ textAlignVertical: "top" }}
          />
        </View>

        {/* Buttons */}
        <View className="flex-row gap-2 pt-2">
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
      </View>
    </ModalOverlay>
  );
}
