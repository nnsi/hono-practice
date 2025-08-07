import React, { useState } from "react";

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

import { useCreateTask } from "../../hooks";

interface TaskCreateDialogProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TaskCreateDialog({
  visible,
  onClose,
  onSuccess,
}: TaskCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const createTask = useCreateTask();

  const handleSubmit = async () => {
    if (!title.trim()) return;

    try {
      await createTask({
        title: title.trim(),
        memo: memo.trim() || undefined,
        startDate: startDate
          ? dayjs(startDate).format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD"),
        dueDate: dueDate ? dayjs(dueDate).format("YYYY-MM-DD") : undefined,
      });

      // リセット
      setTitle("");
      setMemo("");
      setStartDate(null);
      setDueDate(null);

      onSuccess();
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleClose = () => {
    setTitle("");
    setMemo("");
    setStartDate(null);
    setDueDate(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>新規タスク</Text>
            <TouchableOpacity onPress={handleClose}>
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
                autoFocus
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
          </ScrollView>

          {/* ボタン */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!title.trim() || createTask.isPending) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!title.trim() || createTask.isPending}
            >
              <Text style={styles.submitButtonText}>作成</Text>
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
