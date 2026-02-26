import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import dayjs from "dayjs";
import { ModalOverlay } from "../common/ModalOverlay";
import { taskRepository } from "../../repositories/taskRepository";

type TaskCreateDialogProps = {
  visible: boolean;
  onClose: () => void;
};

export function TaskCreateDialog({
  visible,
  onClose,
}: TaskCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setStartDate("");
    setDueDate("");
    setMemo("");
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("エラー", "タイトルを入力してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await taskRepository.createTask({
        title: title.trim(),
        startDate: startDate || null,
        dueDate: dueDate || null,
        memo,
      });
      resetForm();
      onClose();
    } catch (e) {
      Alert.alert("エラー", "タスクの作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <ModalOverlay visible={visible} onClose={handleClose} title="タスク作成">
      <View className="gap-4">
        <View>
          <Text className="text-sm text-gray-500 mb-1">タイトル</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={title}
            onChangeText={setTitle}
            placeholder="タスク名"
            autoFocus
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 mb-1">
            開始日（任意 YYYY-MM-DD）
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 mb-1">
            期限日（任意 YYYY-MM-DD）
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 mb-1">メモ（任意）</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={memo}
            onChangeText={setMemo}
            placeholder="メモ"
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          className={`mt-2 mb-4 py-3 rounded-xl items-center ${
            isSubmitting ? "bg-blue-300" : "bg-blue-500"
          }`}
          onPress={handleCreate}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-base">
            {isSubmitting ? "作成中..." : "作成"}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalOverlay>
  );
}
