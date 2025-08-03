import { useEffect, useMemo } from "react";

import { useGlobalDate } from "@frontend/hooks";
import { useActivityLogs } from "@frontend/hooks/api";
import { useOfflineTasks } from "@frontend/hooks/sync/useOfflineTasks";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import { createWebNetworkAdapter } from "@packages/frontend-shared/adapters";
import { createUseDailyPage } from "@packages/frontend-shared/hooks/feature";
import dayjs from "dayjs";

// 新しい共通化されたフックを使用する実装
export const useDailyPage = () => {
  const { date, setDate } = useGlobalDate();
  const { isOnline } = useNetworkStatusContext();

  // API hooks
  // const activitiesQuery = useActivities(); // Removed as it's not used
  const activityLogsQuery = useActivityLogs(date, { enabled: isOnline });
  const tasksQuery = useOfflineTasks({
    date: dayjs(date).format("YYYY-MM-DD"),
  });

  // Create network adapter once
  const networkAdapter = useMemo(() => createWebNetworkAdapter(), []);

  // Create dependencies with useMemo to prevent recreation
  const dependencies = useMemo(
    () => ({
      network: networkAdapter,
      dateStore: {
        date,
        setDate,
      },
      api: {
        getActivityLogs: async (_date: Date) => {
          // Since we're using React Query, we'll use the cached data
          // In a real migration, you might want to use queryClient.fetchQuery
          return activityLogsQuery.data || [];
        },
        getTasks: async (_params: { date: string }) => {
          // Return tasks data in expected format
          return tasksQuery.data || [];
        },
        getActivities: async () => {
          // Avoid refetch here as it can cause infinite loops
          // The activities are already being fetched by the useActivities hook
          return;
        },
      },
      tasksData: tasksQuery.data,
      storage: {
        getOfflineActivityLogs: async (date: Date) => {
          const dateStr = dayjs(date).format("YYYY-MM-DD");
          const storageKey = `offline-activity-logs-${dateStr}`;
          const storedData = localStorage.getItem(storageKey);

          if (!storedData) return [];

          try {
            const parsedData = JSON.parse(storedData);
            return parsedData.map((log: any) => ({
              ...log,
              createdAt: new Date(log.createdAt),
              updatedAt: new Date(log.updatedAt),
              isOffline: true, // Ensure isOffline flag is set
            }));
          } catch (error) {
            console.error("Failed to parse offline activity logs:", error);
            return [];
          }
        },
        getDeletedActivityLogIds: async (date: Date) => {
          const dateStr = dayjs(date).format("YYYY-MM-DD");
          const deletedKey = `deleted-activity-logs-${dateStr}`;
          const deletedData = localStorage.getItem(deletedKey);

          return new Set(
            deletedData ? (JSON.parse(deletedData) as string[]) : [],
          );
        },
        addStorageListener: (callback: () => void) => {
          let debounceTimer: NodeJS.Timeout;
          let lastEventTime = 0;
          const MIN_EVENT_INTERVAL = 1000; // 1秒間の最小間隔

          const debouncedCallback = () => {
            const now = Date.now();
            if (now - lastEventTime < MIN_EVENT_INTERVAL) {
              return; // 短すぎる間隔のイベントは無視
            }
            lastEventTime = now;

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(callback, 500);
          };

          const handleStorageChange = (e: StorageEvent) => {
            // Listen to both activity logs and tasks storage changes for the current date
            const currentDateStr = dayjs(date).format("YYYY-MM-DD");
            if (
              (e.key === `offline-activity-logs-${currentDateStr}` ||
                e.key === `deleted-activity-logs-${currentDateStr}` ||
                e.key === `offline-tasks-${currentDateStr}` ||
                e.key === `deleted-tasks-${currentDateStr}`) &&
              e.newValue !== e.oldValue // 実際に値が変更された場合のみ
            ) {
              debouncedCallback();
            }
          };

          window.addEventListener("storage", handleStorageChange);

          // Also listen for custom sync events
          const handleSyncDelete = () => debouncedCallback();
          window.addEventListener("sync-delete-success", handleSyncDelete);

          // Listen for offline-data-updated event
          const handleOfflineDataUpdate = () => debouncedCallback();
          window.addEventListener(
            "offline-data-updated",
            handleOfflineDataUpdate,
          );

          return () => {
            clearTimeout(debounceTimer);
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("sync-delete-success", handleSyncDelete);
            window.removeEventListener(
              "offline-data-updated",
              handleOfflineDataUpdate,
            );
          };
        },
        getOfflineTasks: async (date: Date) => {
          const dateStr = dayjs(date).format("YYYY-MM-DD");
          const storageKey = `offline-tasks-${dateStr}`;
          const storedData = localStorage.getItem(storageKey);

          if (!storedData) return [];

          try {
            const parsedData = JSON.parse(storedData);
            return parsedData.map((task: any) => ({
              ...task,
              createdAt: new Date(task.createdAt),
              updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
              archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
            }));
          } catch (error) {
            console.error("Failed to parse offline tasks:", error);
            return [];
          }
        },
        getDeletedTaskIds: async (date: Date) => {
          const dateStr = dayjs(date).format("YYYY-MM-DD");
          const deletedKey = `deleted-tasks-${dateStr}`;
          const deletedData = localStorage.getItem(deletedKey);

          return new Set(
            deletedData ? (JSON.parse(deletedData) as string[]) : [],
          );
        },
      },
    }),
    // dateとisOnlineのみを依存配列に含める（storage関数は安定している）
    [date, setDate, networkAdapter, isOnline],
  );

  // Use the common hook
  const result = createUseDailyPage(dependencies);

  // sync-delete-successイベントを受け取ったらactivityLogsQueryを再フェッチ
  useEffect(() => {
    const handleDeleteSuccess = () => {
      console.log("Received sync-delete-success, refetching activity logs");
      activityLogsQuery.refetch();
    };

    window.addEventListener("sync-delete-success", handleDeleteSuccess);

    return () => {
      window.removeEventListener("sync-delete-success", handleDeleteSuccess);
    };
  }, [activityLogsQuery]);

  // Map back to the expected shape with React Query integration
  return {
    ...result,
    // Use mergedActivityLogs from the common hook instead of raw React Query data
    // This includes offline data and handles deletions properly
    activityLogs: result.mergedActivityLogs,
    isLoading: activityLogsQuery.isLoading,
    tasks: result.tasks, // result.tasksを使用してcreateUseDailyPageの結果を反映
    isTasksLoading: tasksQuery.isLoading,
  };
};
