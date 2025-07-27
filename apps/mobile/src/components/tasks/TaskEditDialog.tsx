import React, { useState, useEffect } from "react";

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";


import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";

import { useTaskEdit } from "../../hooks/useTaskEdit";
import { Alert } from "../../utils/AlertWrapper";

interface TaskEditDialogProps {
  visible: boolean;
  onClose: () => void;
  task: {
    id: string;
    title: string;
    memo: string | null;
    startDate: string | null;
    dueDate: string | null;
    doneDate: string | null;
    archivedAt: string | null;
  };
  onSuccess: () => void;
}

export function TaskEditDialog({
  visible,
  onClose,
  task,
  onSuccess,
}: TaskEditDialogProps) {
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const { updateTask, deleteTask, isUpdating, isDeleting } = useTaskEdit();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setMemo(task.memo || "");
      setStartDate(task.startDate ? new Date(task.startDate) : null);
      setDueDate(task.dueDate ? new Date(task.dueDate) : null);
    }
  }, [task]);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    try {
      await updateTask({
        id: task.id,
        title: title.trim(),
        memo: memo.trim() || null,
        startDate: startDate ? dayjs(startDate).format("YYYY-MM-DD") : null,
        dueDate: dueDate ? dayjs(dueDate).format("YYYY-MM-DD") : null,
      });

      onSuccess();
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDelete = () => {
    Alert.alert("タスクを削除", "このタスクを削除してもよろしいですか？", [
      {
        text: "キャンセル",
        style: "cancel",
      },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTask(task.id);
            onSuccess();
          } catch (error) {
            console.error("Failed to delete task:", error);
          }
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>タスクを編集</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            {/* タイトル */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>タイトル *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="タスクのタイトルを入力"
              />
            </View>

            {/* メモ */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>メモ</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={memo}
                onChangeText={setMemo}
                placeholder="メモを入力"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* 開始日 */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>開始日</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {startDate
                    ? dayjs(startDate).format("YYYY年MM月DD日")
                    : "開始日を選択"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {startDate && (
                <TouchableOpacity
                  onPress={() => setStartDate(null)}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>クリア</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 期限 */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>期限</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDueDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {dueDate
                    ? dayjs(dueDate).format("YYYY年MM月DD日")
                    : "期限を選択"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {dueDate && (
                <TouchableOpacity
                  onPress={() => setDueDate(null)}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>クリア</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 削除ボタン */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.deleteButtonText}>タスクを削除</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* ボタン */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!title.trim() || isUpdating) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!title.trim() || isUpdating}
            >
              <Text style={styles.submitButtonText}>更新</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* DatePickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (event.type === "set" && selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      {showDueDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDueDatePicker(false);
            if (event.type === "set" && selectedDate) {
              setDueDate(selectedDate);
            }
          }}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#111827",
  },
  clearButton: {
    marginTop: 8,
  },
  clearButtonText: {
    color: "#3B82F6",
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  deleteButtonText: {
    color: "#EF4444",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6B7280",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "500",
  },
});
