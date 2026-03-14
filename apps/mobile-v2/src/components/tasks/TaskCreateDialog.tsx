import dayjs from "dayjs";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useActivities } from "../../hooks/useActivities";
import { DatePickerField } from "../common/DatePickerField";
import { ModalOverlay } from "../common/ModalOverlay";
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
    activityId,
    setActivityId,
    startDate,
    setStartDate,
    dueDate,
    setDueDate,
    memo,
    setMemo,
    isSubmitting,
    handleCreate,
  } = useTaskCreateDialog(onSuccess, defaultDate);

  const { activities } = useActivities();

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
                  onPress={() => setActivityId(null)}
                  className={`px-3 py-1.5 rounded-full border ${
                    activityId === null
                      ? "bg-gray-900 border-gray-900"
                      : "bg-white border-gray-300"
                  }`}
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
                      setActivityId(activityId === a.id ? null : a.id)
                    }
                    className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                      activityId === a.id
                        ? "bg-gray-900 border-gray-900"
                        : "bg-white border-gray-300"
                    }`}
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
