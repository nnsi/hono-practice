import { View, Text, TextInput, TouchableOpacity } from "react-native";
import dayjs from "dayjs";
import { ModalOverlay } from "../common/ModalOverlay";
import { DatePickerField } from "../common/DatePickerField";
import { useTaskCreateDialog } from "./useTaskCreateDialog";

export function TaskCreateDialog({
  onClose,
  onSuccess,
  defaultDate,
}: {
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: string;
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
    handleCreate,
  } = useTaskCreateDialog(onSuccess, defaultDate);

  return (
    <ModalOverlay visible onClose={onClose} title="新しいタスクを作成">
      <View className="gap-4 pb-4">
        {/* Title */}
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">
            タイトル <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="タスクのタイトルを入力"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            autoFocus
          />
        </View>

        {/* Dates */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <DatePickerField
              value={startDate || dayjs().format("YYYY-MM-DD")}
              onChange={setStartDate}
              label="開始日"
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm text-gray-500 mb-1">期限（任意）</Text>
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
            placeholder="タスクに関するメモを入力"
            multiline
            numberOfLines={3}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            style={{ textAlignVertical: "top" }}
          />
        </View>

        {/* Buttons */}
        <View className="flex-row gap-2 pt-2">
          <TouchableOpacity
            onPress={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg items-center"
          >
            <Text className="text-sm text-gray-700">キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={isSubmitting || !title.trim()}
            className={`flex-1 py-2.5 rounded-lg items-center ${
              isSubmitting || !title.trim() ? "bg-blue-300" : "bg-blue-600"
            }`}
          >
            <Text className="text-sm text-white font-medium">
              {isSubmitting ? "作成中..." : "作成"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalOverlay>
  );
}
