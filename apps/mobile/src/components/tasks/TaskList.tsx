import React, { useState } from "react";

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTasks } from "../../hooks/useTasks";

import { EmptyState } from "./EmptyState";
import { TaskCreateDialog } from "./TaskCreateDialog";
import { TaskGroup } from "./TaskGroup";

export function TaskList() {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const {
    groupedTasks,
    archivedTasks,
    isTasksLoading,
    isArchivedTasksLoading,
    hasAnyTasks,
    hasAnyArchivedTasks,
    refetch,
  } = useTasks();

  if (isTasksLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* タブ */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.activeTabText,
            ]}
          >
            アクティブ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "archived" && styles.activeTab]}
          onPress={() => setActiveTab("archived")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "archived" && styles.activeTabText,
            ]}
          >
            アーカイブ済み
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "active" ? (
        <View style={styles.content}>
          {!hasAnyTasks && (
            <EmptyState onCreateClick={() => setCreateDialogOpen(true)} />
          )}

          {/* 期限切れ */}
          {groupedTasks.overdue.length > 0 && (
            <TaskGroup
              title="期限切れ"
              tasks={groupedTasks.overdue}
              isLoading={isTasksLoading}
              titleColor="#DC2626"
              highlight
            />
          )}

          {/* 今日締切 */}
          {groupedTasks.dueToday.length > 0 && (
            <TaskGroup
              title="今日締切"
              tasks={groupedTasks.dueToday}
              isLoading={isTasksLoading}
              titleColor="#EA580C"
            />
          )}

          {/* 今日開始 */}
          {groupedTasks.startingToday.length > 0 && (
            <TaskGroup
              title="今日開始"
              tasks={groupedTasks.startingToday}
              isLoading={isTasksLoading}
              titleColor="#2563EB"
            />
          )}

          {/* 進行中 */}
          {groupedTasks.inProgress.length > 0 && (
            <TaskGroup
              title="進行中"
              tasks={groupedTasks.inProgress}
              isLoading={isTasksLoading}
              titleColor="#16A34A"
            />
          )}

          {/* 今週締切 */}
          {groupedTasks.dueThisWeek.length > 0 && (
            <TaskGroup
              title="今週締切"
              tasks={groupedTasks.dueThisWeek}
              isLoading={isTasksLoading}
            />
          )}

          {/* 未来のタスク */}
          {(groupedTasks.notStarted.length > 0 ||
            groupedTasks.future.length > 0) && (
            <View>
              <TouchableOpacity onPress={() => setShowFuture(!showFuture)}>
                <Text style={styles.toggleText}>
                  {showFuture
                    ? "未来のタスクを隠す"
                    : `未来のタスク (${groupedTasks.notStarted.length + groupedTasks.future.length})`}
                </Text>
              </TouchableOpacity>
              {showFuture && (
                <>
                  {groupedTasks.notStarted.length > 0 && (
                    <TaskGroup
                      title="未開始"
                      tasks={groupedTasks.notStarted}
                      isLoading={isTasksLoading}
                      titleColor="#9333EA"
                    />
                  )}
                  {groupedTasks.future.length > 0 && (
                    <TaskGroup
                      title="来週以降"
                      tasks={groupedTasks.future}
                      isLoading={isTasksLoading}
                      titleColor="#6366F1"
                    />
                  )}
                </>
              )}
            </View>
          )}

          {/* 完了済み */}
          {groupedTasks.completed.length > 0 && (
            <View>
              <TouchableOpacity
                onPress={() => setShowCompleted(!showCompleted)}
              >
                <Text style={styles.toggleText}>
                  {showCompleted
                    ? "完了済みを隠す"
                    : `完了済み (${groupedTasks.completed.length})`}
                </Text>
              </TouchableOpacity>
              {showCompleted && (
                <TaskGroup
                  title="完了済み"
                  tasks={groupedTasks.completed}
                  isLoading={isTasksLoading}
                  completed
                />
              )}
            </View>
          )}

          {/* 新規タスク追加カード */}
          <TouchableOpacity
            style={styles.addCard}
            onPress={() => setCreateDialogOpen(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#9CA3AF" />
            <Text style={styles.addCardText}>新規タスクを追加</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          {!hasAnyArchivedTasks && (
            <View style={styles.emptyArchive}>
              <Text style={styles.emptyArchiveText}>
                アーカイブ済みのタスクはありません
              </Text>
            </View>
          )}
          {archivedTasks && archivedTasks.length > 0 && (
            <TaskGroup
              title="アーカイブ済み"
              tasks={archivedTasks}
              isLoading={isArchivedTasksLoading}
              archived
            />
          )}
        </View>
      )}

      <TaskCreateDialog
        visible={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={() => {
          setCreateDialogOpen(false);
          refetch();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  content: {
    padding: 16,
  },
  toggleText: {
    color: "#666",
    fontSize: 14,
    marginVertical: 8,
  },
  addCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginTop: 8,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  addCardText: {
    marginLeft: 8,
    color: "#666",
    fontSize: 14,
  },
  emptyArchive: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyArchiveText: {
    color: "#666",
    fontSize: 16,
  },
});
