import { useState } from "react";

import type { NetworkAdapter } from "@packages/frontend-shared/adapters";
import type { GetActivityLogResponse, GetTasksResponse } from "@packages/types";

export type DailyPageDependencies = {
  network: NetworkAdapter;
  dateStore: {
    date: Date;
    setDate: (date: Date) => void;
  };
  api: {
    getActivityLogs: (date: Date) => Promise<GetActivityLogResponse[]>;
    getTasks: (params: { date: string }) => Promise<GetTasksResponse>;
    getActivities: () => Promise<void>;
  };
  storage?: {
    getOfflineActivityLogs: (
      date: Date,
    ) => Promise<Array<GetActivityLogResponse & { isOffline?: boolean }>>;
    getDeletedActivityLogIds: (date: Date) => Promise<Set<string>>;
    addStorageListener?: (callback: () => void) => () => void;
    getOfflineTasks?: (date: Date) => Promise<GetTasksResponse>;
    getDeletedTaskIds?: (date: Date) => Promise<Set<string>>;
  };
  activityLogsData?: GetActivityLogResponse[]; // React Queryから渡されるアクティビティログデータ
  tasksData?: GetTasksResponse; // React Queryから渡されるタスクデータ
};

export function createUseDailyPage(dependencies: DailyPageDependencies) {
  const { network, dateStore, activityLogsData, tasksData } = dependencies;
  const { date, setDate } = dateStore;

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTargetLog, setEditTargetLog] =
    useState<GetActivityLogResponse | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Network status
  const isOnline = network.isOnline();

  // Use provided data directly without additional state management
  const activityLogs = activityLogsData ?? [];
  const tasks = tasksData ?? null;
  const isLoading = false; // Loading is handled by parent
  const isTasksLoading = false; // Loading is handled by parent

  // Use activity logs directly without merging offline data
  const mergedActivityLogs = activityLogs;
  const isOfflineData = (_log: GetActivityLogResponse) => false;

  // Use tasks directly without merging offline data
  const mergedTasks = tasks;

  // Network status change listener - removed to prevent infinite loops
  // The network status is already being handled by the components using this hook

  // Handlers
  const handleActivityLogClick = (log: GetActivityLogResponse) => {
    setEditTargetLog(log);
    setEditDialogOpen(true);
  };

  const handleActivityLogEditDialogChange = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditTargetLog(null);
    }
  };

  return {
    // State
    date,
    setDate,
    editDialogOpen,
    editTargetLog,
    createDialogOpen,
    setCreateDialogOpen,

    // Data
    activityLogs,
    isLoading,
    tasks: mergedTasks,
    isTasksLoading,
    mergedActivityLogs,
    isOfflineData,
    isOnline,

    // Handlers
    handleActivityLogClick,
    handleActivityLogEditDialogChange,
  };
}
