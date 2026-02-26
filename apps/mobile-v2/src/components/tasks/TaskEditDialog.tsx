import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { ModalOverlay } from "../common/ModalOverlay";
import { taskRepository } from "../../repositories/taskRepository";
import dayjs from "dayjs";

type Task = {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  doneDate: string | null;
  memo: string;
};

type TaskEditDialogProps = {
  visible: boolean;
  onClose: () => void;
  task: Task | null;
};

export function TaskEditDialog({
  visible,
  onClose,
  task,
}: TaskEditDialogProps) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStartDate(task.startDate || "");
      setDueDate(task.dueDate || "");
      setMemo(task.memo);
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;
    if (!title.trim()) {
      Alert.alert("エラー", "タイトルを入力してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await taskRepository.updateTask(task.id, {
        title: title.trim(),
        startDate: startDate || null,
        dueDate: dueDate || null,
        memo,
      });
      onClose();
    } catch (e) {
      Alert.alert("エラー", "更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDone = async () => {
    if (!task) return;
    const newDoneDate = task.doneDate
      ? null
      : dayjs().format("YYYY-MM-DD");
    await taskRepository.updateTask(task.id, { doneDate: newDoneDate });
    onClose();
  };

  const handleArchive = async () => {
    if (!task) return;
    await taskRepository.archiveTask(task.id);
    onClose();
  };

  const handleDelete = () => {
    if (!task) return;
    Alert.alert("削除確認", "このタスクを削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          await taskRepository.softDeleteTask(task.id);
          onClose();
        },
      },
    ]);
  };

  if (!task) return null;

  const isDone = task.doneDate !== null;

  return (
    <ModalOverlay visible={visible} onClose={onClose} title="タスク編集">
      <View className="gap-4">
        <View>
          <Text className="text-sm text-gray-500 mb-1">タイトル</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={title}
            onChangeText={setTitle}
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

        {/* Action buttons */}
        <TouchableOpacity
          className="py-2.5 rounded-lg items-center border border-gray-300"
          onPress={handleToggleDone}
        >
          <Text className="text-gray-700 font-medium text-sm">
            {isDone ? "未完了に戻す" : "完了にする"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`py-3 rounded-xl items-center ${
            isSubmitting ? "bg-blue-300" : "bg-blue-500"
          }`}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-base">
            {isSubmitting ? "保存中..." : "保存"}
          </Text>
        </TouchableOpacity>

        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 py-2.5 rounded-lg items-center border border-gray-300"
            onPress={handleArchive}
          >
            <Text className="text-gray-500 font-medium text-sm">
              アーカイブ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-2.5 rounded-lg items-center border border-red-300"
            onPress={handleDelete}
          >
            <Text className="text-red-500 font-medium text-sm">削除</Text>
          </TouchableOpacity>
        </View>

        <View className="h-4" />
      </View>
    </ModalOverlay>
  );
}
