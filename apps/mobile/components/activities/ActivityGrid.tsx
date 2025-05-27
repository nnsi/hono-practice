import React, { useState } from "react";

import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useDate } from "../../providers/DateProvider";
import { api } from "../../utils/apiClient";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  activityKindId: string;
};

type ActivityLog = {
  id: string;
  activityId: string;
  count: number;
  date: string;
};

export const ActivityGrid = () => {
  const { selectedDate, formatDate } = useDate();
  const queryClient = useQueryClient();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logCount, setLogCount] = useState("1");
  const [newActivity, setNewActivity] = useState({ name: "", emoji: "📝" });
  const [editingActivity, setEditingActivity] = useState({
    name: "",
    emoji: "",
  });

  const dateString = formatDate(selectedDate);

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => api.activities.list(),
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ["activityLogs", dateString],
    queryFn: () => api.activityLogs.list(dateString),
  });

  const createActivityMutation = useMutation({
    mutationFn: api.activities.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setCreateModalVisible(false);
      setNewActivity({ name: "", emoji: "📝" });
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create activity",
      );
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.activities.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setEditModalVisible(false);
      setSelectedActivity(null);
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update activity",
      );
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: api.activities.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setEditModalVisible(false);
      setSelectedActivity(null);
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to delete activity",
      );
    },
  });

  const createLogMutation = useMutation({
    mutationFn: api.activityLogs.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activityLogs", dateString] });
      setLogModalVisible(false);
      setLogCount("1");
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to log activity",
      );
    },
  });

  const handleActivityPress = (activity: Activity) => {
    setSelectedActivity(activity);
    setLogModalVisible(true);
  };

  const handleActivityLongPress = (activity: Activity) => {
    setSelectedActivity(activity);
    setEditingActivity({ name: activity.name, emoji: activity.emoji });
    setEditModalVisible(true);
  };

  const handleCreateActivity = () => {
    if (!newActivity.name.trim()) {
      Alert.alert("Error", "Please enter activity name");
      return;
    }
    createActivityMutation.mutate({
      name: newActivity.name,
      emoji: newActivity.emoji,
      activityKindId: "1", // Default kind
    });
  };

  const handleUpdateActivity = () => {
    if (!selectedActivity || !editingActivity.name.trim()) return;
    updateActivityMutation.mutate({
      id: selectedActivity.id,
      data: editingActivity,
    });
  };

  const handleDeleteActivity = () => {
    if (!selectedActivity) return;
    Alert.alert(
      "Delete Activity",
      "Are you sure you want to delete this activity?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteActivityMutation.mutate(selectedActivity.id),
        },
      ],
    );
  };

  const handleLogActivity = () => {
    if (!selectedActivity || !logCount) return;
    const count = Number.parseInt(logCount);
    if (Number.isNaN(count) || count < 1) {
      Alert.alert("Error", "Please enter a valid count");
      return;
    }
    createLogMutation.mutate({
      activityId: selectedActivity.id,
      count,
      date: dateString,
    });
  };

  const isActivityLogged = (activityId: string) => {
    return activityLogs.some(
      (log: ActivityLog) => log.activityId === activityId,
    );
  };

  const renderActivity = ({ item }: { item: Activity }) => {
    const isLogged = isActivityLogged(item.id);
    return (
      <TouchableOpacity
        style={[styles.activityItem, isLogged && styles.activityLogged]}
        onPress={() => handleActivityPress(item)}
        onLongPress={() => handleActivityLongPress(item)}
      >
        <Text style={styles.activityEmoji}>{item.emoji}</Text>
        <Text style={styles.activityName}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  if (activitiesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading activities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setCreateModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        }
      />

      {/* Create Activity Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Activity</Text>
            <TextInput
              style={styles.input}
              placeholder="Activity name"
              value={newActivity.name}
              onChangeText={(text) =>
                setNewActivity({ ...newActivity, name: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Emoji"
              value={newActivity.emoji}
              onChangeText={(text) =>
                setNewActivity({ ...newActivity, emoji: text })
              }
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={handleCreateActivity}
              >
                <Text style={styles.primaryButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Activity Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Activity</Text>
            <TextInput
              style={styles.input}
              placeholder="Activity name"
              value={editingActivity.name}
              onChangeText={(text) =>
                setEditingActivity({ ...editingActivity, name: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Emoji"
              value={editingActivity.emoji}
              onChangeText={(text) =>
                setEditingActivity({ ...editingActivity, emoji: text })
              }
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteActivity}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={handleUpdateActivity}
              >
                <Text style={styles.primaryButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Log Activity Modal */}
      <Modal
        visible={logModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLogModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Activity</Text>
            {selectedActivity && (
              <View style={styles.selectedActivity}>
                <Text style={styles.selectedEmoji}>
                  {selectedActivity.emoji}
                </Text>
                <Text style={styles.selectedName}>{selectedActivity.name}</Text>
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Count"
              value={logCount}
              onChangeText={setLogCount}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={handleLogActivity}
              >
                <Text style={styles.primaryButtonText}>Log</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  grid: {
    padding: 16,
  },
  activityItem: {
    flex: 1,
    margin: 8,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    aspectRatio: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityLogged: {
    backgroundColor: "#e8f5e9",
  },
  activityEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  activityName: {
    fontSize: 14,
    textAlign: "center",
  },
  addButton: {
    flex: 1,
    margin: 8,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  addButtonText: {
    fontSize: 32,
    color: "#999",
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
  deleteButton: {
    backgroundColor: "#ff4444",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
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
});
