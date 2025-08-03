import { useEffect, useMemo, useState } from "react";

import dayjs from "dayjs";

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
  tasksData?: GetTasksResponse; // React Queryから渡されるタスクデータ
};

export function createUseDailyPage(dependencies: DailyPageDependencies) {
  const { network, dateStore, api, storage, tasksData } = dependencies;
  const { date, setDate } = dateStore;

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTargetLog, setEditTargetLog] =
    useState<GetActivityLogResponse | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Data states
  const [activityLogs, setActivityLogs] = useState<GetActivityLogResponse[]>(
    [],
  );
  const [tasks, setTasks] = useState<GetTasksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [offlineDataTrigger, setOfflineDataTrigger] = useState(0);
  const [offlineTasks, setOfflineTasks] = useState<GetTasksResponse>([]);
  const [deletedTaskIds, setDeletedTaskIds] = useState<Set<string>>(new Set());

  // Network status
  const isOnline = network.isOnline();

  // Fetch activity logs
  useEffect(() => {
    if (!isOnline) {
      // Don't clear activity logs when offline - they might be cached
      setIsLoading(false);
      return;
    }

    const fetchActivityLogs = async () => {
      setIsLoading(true);
      try {
        const logs = await api.getActivityLogs(date);
        setActivityLogs(logs);
      } catch (error) {
        console.error("Failed to fetch activity logs:", error);
        setActivityLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityLogs();
  }, [date, isOnline, api]);

  // Use tasks from React Query or fetch if not provided
  useEffect(() => {
    if (tasksData !== undefined) {
      // React Queryから渡されたデータを使用
      setTasks(tasksData);
      setIsTasksLoading(false);
      return;
    }

    if (!isOnline) {
      // Don't clear tasks when offline - they might be cached
      setIsTasksLoading(false);
      return;
    }

    const fetchTasks = async () => {
      setIsTasksLoading(true);
      try {
        const dateStr = dayjs(date).format("YYYY-MM-DD");
        const tasksData = await api.getTasks({ date: dateStr });
        setTasks(tasksData);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        setTasks(null);
      } finally {
        setIsTasksLoading(false);
      }
    };

    fetchTasks();
  }, [date, api, isOnline, tasksData]);

  // Fetch activities (for reference data) - only once on mount
  useEffect(() => {
    api.getActivities().catch((error) => {
      console.error("Failed to fetch activities:", error);
    });
  }, []); // Empty dependency array to run only once

  // State for offline data
  const [offlineActivityLogs, setOfflineActivityLogs] = useState<
    Array<GetActivityLogResponse & { isOffline?: boolean }>
  >([]);
  const [deletedActivityLogIds, setDeletedActivityLogIds] = useState<
    Set<string>
  >(new Set());

  // Load offline data
  useEffect(() => {
    if (!storage) return;

    let isCancelled = false;
    let loadingInProgress = false;

    const loadOfflineData = async () => {
      // Prevent concurrent loads
      if (loadingInProgress) {
        console.log("Load already in progress, skipping");
        return;
      }

      loadingInProgress = true;
      console.log("Loading offline data for date:", date);

      try {
        const [offlineLogs, deletedIds] = await Promise.all([
          storage.getOfflineActivityLogs(date),
          storage.getDeletedActivityLogIds(date),
        ]);

        if (!isCancelled) {
          console.log("Loaded offline logs:", offlineLogs);
          setOfflineActivityLogs(offlineLogs);
          setDeletedActivityLogIds(deletedIds);
        }
      } catch (error) {
        console.error("Failed to load offline data:", error);
        // Reset state on error
        if (!isCancelled) {
          setOfflineActivityLogs([]);
          setDeletedActivityLogIds(new Set());
        }
      } finally {
        loadingInProgress = false;
      }
    };

    loadOfflineData();

    return () => {
      isCancelled = true;
    };
  }, [date, storage, offlineDataTrigger]);

  // Load offline tasks
  useEffect(() => {
    if (!storage?.getOfflineTasks) return;

    let isCancelled = false;

    const loadOfflineTasks = async () => {
      try {
        const [offlineTasksData, deletedIds] = await Promise.all([
          storage.getOfflineTasks!(date),
          storage.getDeletedTaskIds
            ? storage.getDeletedTaskIds(date)
            : Promise.resolve(new Set<string>()),
        ]);

        if (!isCancelled) {
          setOfflineTasks(offlineTasksData);
          setDeletedTaskIds(deletedIds);
        }
      } catch (error) {
        console.error("Failed to load offline tasks:", error);
        if (!isCancelled) {
          setOfflineTasks([]);
          setDeletedTaskIds(new Set());
        }
      }
    };

    loadOfflineTasks();

    return () => {
      isCancelled = true;
    };
  }, [date, storage, offlineDataTrigger]);

  // Offline data synchronization
  const { mergedActivityLogs, isOfflineData } = useMemo(() => {
    if (!storage) {
      return {
        mergedActivityLogs: activityLogs,
        isOfflineData: (_log: GetActivityLogResponse) => false,
      };
    }

    // Create a map for offline logs by ID
    const offlineLogsMap = new Map(
      offlineActivityLogs.map((log) => [log.id, { ...log, isOffline: true }]),
    );

    // Merge online and offline logs
    const merged: Array<GetActivityLogResponse & { isOffline?: boolean }> = [];
    const processedIds = new Set<string>();

    // Add or update logs from online data
    activityLogs.forEach((log) => {
      if (!deletedActivityLogIds.has(log.id)) {
        // Check if there's an offline version
        const offlineLog = offlineLogsMap.get(log.id);
        if (offlineLog && offlineLog.updatedAt > log.updatedAt) {
          // Use offline version if it's newer
          merged.push(offlineLog);
        } else {
          merged.push(log);
        }
        processedIds.add(log.id);
      }
    });

    // Add offline-only logs
    offlineActivityLogs.forEach((log) => {
      if (!processedIds.has(log.id) && !deletedActivityLogIds.has(log.id)) {
        merged.push({ ...log, isOffline: true });
      }
    });

    // Sort by createdAt descending - handle invalid dates
    merged.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);

      // Handle invalid dates
      if (Number.isNaN(dateA.getTime())) return 1;
      if (Number.isNaN(dateB.getTime())) return -1;

      return dateB.getTime() - dateA.getTime();
    });

    return {
      mergedActivityLogs: merged,
      isOfflineData: (log: GetActivityLogResponse) => {
        return (log as any).isOffline === true;
      },
    };
  }, [activityLogs, offlineActivityLogs, deletedActivityLogIds, storage]);

  // Storage change listener
  useEffect(() => {
    if (!storage?.addStorageListener) return;

    let isUnmounted = false;

    const unsubscribe = storage.addStorageListener(() => {
      if (isUnmounted) return;

      console.log("Storage changed, triggering offline data reload");
      setOfflineDataTrigger((prev) => prev + 1);
    });

    return () => {
      isUnmounted = true;
      unsubscribe();
    };
  }, [storage]);

  // Merge online and offline tasks
  const mergedTasks = useMemo(() => {
    const onlineTasks = tasks || [];
    const allTasks = [...onlineTasks];
    const processedIds = new Set<string>();

    // Add online tasks (excluding deleted ones)
    onlineTasks.forEach((task) => {
      if (!deletedTaskIds.has(task.id)) {
        processedIds.add(task.id);
      }
    });

    // Add offline-only tasks
    offlineTasks.forEach((task) => {
      if (!processedIds.has(task.id) && !deletedTaskIds.has(task.id)) {
        allTasks.push(task);
      }
    });

    return allTasks;
  }, [tasks, offlineTasks, deletedTaskIds]);

  // Network status change listener
  useEffect(() => {
    const unsubscribe = network.addListener((online) => {
      if (online) {
        // Refetch data when coming online
        setTimeout(() => {
          setOfflineDataTrigger((prev) => prev + 1);
        }, 100);
      }
    });

    return unsubscribe;
  }, [network]);

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
