import { useMemo } from "react";

import { useGlobalDate } from "@frontend/hooks";
import { useActivityLogs, useTasks } from "@frontend/hooks/api";
import { createWebNetworkAdapter } from "@packages/frontend-shared/adapters";
import { createUseDailyPage } from "@packages/frontend-shared/hooks/feature";
import dayjs from "dayjs";

// 新しい共通化されたフックを使用する実装
export const useDailyPage = () => {
  const { selectedDate: date, setSelectedDate: setDate } = useGlobalDate();

  // API hooks
  const activityLogsQuery = useActivityLogs(date);
  const tasksQuery = useTasks({
    date: dayjs(date).format("YYYY-MM-DD"),
  });

  // Create network adapter once
  const networkAdapter = useMemo(() => createWebNetworkAdapter(), []);

  // Create storage object once - now it does nothing since we removed offline sync
  const storage = useMemo(
    () => ({
      getOfflineActivityLogs: async (_date: Date) => {
        return [];
      },
      getDeletedActivityLogIds: async (_date: Date) => {
        return new Set<string>();
      },
      addStorageListener: (_callback: () => void) => {
        return () => {};
      },
      getOfflineTasks: async (_date: Date) => {
        return [];
      },
      getDeletedTaskIds: async (_date: Date) => {
        return new Set<string>();
      },
    }),
    [],
  ); // 空の依存配列で一度だけ作成

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
          // 既にactivityLogsDataとして渡されるので、ここでは空配列を返す
          return [];
        },
        getTasks: async (_params: { date: string }) => {
          // 既にtasksDataとして渡されるので、ここでは空配列を返す
          return [];
        },
        getActivities: async () => {
          // 何もしない - activitiesはuseActivitiesフックで管理
          return;
        },
      },
      // React Queryから取得したデータを直接渡す
      activityLogsData: activityLogsQuery.data,
      tasksData: tasksQuery.data,
      storage,
    }),
    // 最小限の依存配列：dateとデータのみ、storageは除外
    [
      date,
      setDate,
      networkAdapter,
      activityLogsQuery.data,
      tasksQuery.data,
      storage,
    ],
  );

  // Use the common hook
  const result = createUseDailyPage(dependencies);

  // Map back to the expected shape with React Query integration
  return {
    ...result,
    // Use mergedActivityLogs from the common hook instead of raw React Query data
    // This includes offline data and handles deletions properly
    activityLogs: result.mergedActivityLogs,
    // Pass through the original data to ensure compatibility
    mergedActivityLogs: result.mergedActivityLogs,
    isLoading: activityLogsQuery.isLoading,
    tasks: result.tasks, // result.tasksを使用してcreateUseDailyPageの結果を反映
    isTasksLoading: tasksQuery.isLoading,
  };
};
