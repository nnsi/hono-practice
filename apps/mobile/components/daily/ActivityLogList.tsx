import { useState } from "react";

import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useDate } from "../../providers/DateProvider";
import { api } from "../../utils/apiClient";

type ActivityLog = {
  id: string;
  activityId: string;
  count: number;
  date: string;
  activity: {
    id: string;
    name: string;
    emoji: string;
  };
};

export const ActivityLogList = () => {
  const { selectedDate, formatDate } = useDate();
  const queryClient = useQueryClient();
  const [editingLog, setEditingLog] = useState<ActivityLog | null>(null);
  const [editCount, setEditCount] = useState("");
  const dateString = formatDate(selectedDate);

  const { data: activityLogs = [], isLoading } = useQuery({
    queryKey: ["activityLogs", dateString],
    queryFn: () => api.activityLogs.list(dateString),
  });

  const updateLogMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.activityLogs.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activityLogs", dateString] });
      setEditingLog(null);
      setEditCount("");
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update log",
      );
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: api.activityLogs.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activityLogs", dateString] });
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to delete log",
      );
    },
  });

  const handleEditLog = (log: ActivityLog) => {
    setEditingLog(log);
    setEditCount(log.count.toString());
  };

  const handleUpdateLog = () => {
    if (!editingLog || !editCount) return;
    const count = Number.parseInt(editCount);
    if (Number.isNaN(count) || count < 1) {
      Alert.alert("Error", "Please enter a valid count");
      return;
    }
    updateLogMutation.mutate({
      id: editingLog.id,
      data: { count },
    });
  };

  const handleDeleteLog = (logId: string) => {
    Alert.alert(
      "Delete Activity Log",
      "Are you sure you want to delete this log?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteLogMutation.mutate(logId),
        },
      ],
    );
  };

  const renderLog = ({ item }: { item: ActivityLog }) => (
    <TouchableOpacity
      style={styles.logItem}
      onPress={() => handleEditLog(item)}
      onLongPress={() => handleDeleteLog(item.id)}
    >
      <View style={styles.logContent}>
        <Text style={styles.emoji}>{item.activity.emoji}</Text>
        <Text style={styles.activityName}>{item.activity.name}</Text>
      </View>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>×{item.count}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={activityLogs}
        renderItem={renderLog}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.logList}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.emptyText}>
              No activities logged for this day
            </Text>
          ) : null
        }
      />

      {/* Edit Log Modal */}
      <Modal
        visible={!!editingLog}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingLog(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Activity Log</Text>
            {editingLog && (
              <View style={styles.selectedActivity}>
                <Text style={styles.selectedEmoji}>
                  {editingLog.activity.emoji}
                </Text>
                <Text style={styles.selectedName}>
                  {editingLog.activity.name}
                </Text>
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Count"
              value={editCount}
              onChangeText={setEditCount}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditingLog(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={handleUpdateLog}
              >
                <Text style={styles.primaryButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logList: {
    padding: 16,
  },
  logItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  activityName: {
    fontSize: 16,
  },
  countBadge: {
    backgroundColor: "#4a90e2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  selectedActivity: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  selectedEmoji: {
    fontSize: 32,
    marginRight: 10,
  },
  selectedName: {
    fontSize: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: "#4a90e2",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  cancelButtonText: {
    color: "#666",
  },
});
