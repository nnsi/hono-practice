import { DeviceEventEmitter } from "react-native";

import { createReactNativeNetworkAdapter } from "@packages/frontend-shared/adapters";
import {
  createUseActivities,
  createUseActivityLogs,
  createUseTasks,
} from "@packages/frontend-shared/hooks";
import { createUseDailyPage } from "@packages/frontend-shared/hooks/feature";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import dayjs from "dayjs";

import { apiClient } from "../utils/apiClient";

import { useGlobalDate } from "./useGlobalDate";

// モバイル版のデイリーページフック
export const useDailyPage = () => {
  const { date, setDate } = useGlobalDate();

  // API hooks
  const activities = createUseActivities({ apiClient });
  const activityLogs = createUseActivityLogs({
    apiClient,
    date,
    enabled: true, // Network status is handled inside the common hook
  });
  const tasks = createUseTasks({
    apiClient,
    date: dayjs(date).format("YYYY-MM-DD"),
  });

  // Create dependencies
  const dependencies = {
    network: createReactNativeNetworkAdapter(NetInfo),
    dateStore: {
      date,
      setDate,
    },
    api: {
      getActivityLogs: async (date: Date) => {
        const result = await activityLogs.refetch();
        return result.data || [];
      },
      getTasks: async (params: { date: string }) => {
        const result = await tasks.refetch();
        return result.data || { activeTasks: [], archivedTasks: [] };
      },
      getActivities: async () => {
        await activities.refetch();
      },
    },
    storage: {
      getOfflineActivityLogs: async (date: Date) => {
        const dateStr = dayjs(date).format("YYYY-MM-DD");
        const storageKey = `offline-activity-logs-${dateStr}`;
        const storedData = await AsyncStorage.getItem(storageKey);

        if (!storedData) return [];

        return JSON.parse(storedData).map((log: any) => ({
          ...log,
          createdAt: new Date(log.createdAt),
          updatedAt: new Date(log.updatedAt),
        }));
      },
      getDeletedActivityLogIds: async (date: Date) => {
        const dateStr = dayjs(date).format("YYYY-MM-DD");
        const deletedKey = `deleted-activity-logs-${dateStr}`;
        const deletedData = await AsyncStorage.getItem(deletedKey);

        return new Set(deletedData ? JSON.parse(deletedData) : []);
      },
      addStorageListener: (callback: () => void) => {
        // Listen for sync events
        const syncListener = DeviceEventEmitter.addListener(
          "sync-complete",
          callback,
        );
        const deleteListener = DeviceEventEmitter.addListener(
          "sync-delete-success",
          callback,
        );

        return () => {
          syncListener.remove();
          deleteListener.remove();
        };
      },
    },
  };

  // Use the common hook
  const result = createUseDailyPage(dependencies);

  // Return with React Query data integration
  return {
    ...result,
    // Override with React Query data
    activityLogs: activityLogs.data,
    isLoading: activityLogs.isLoading,
    tasks: tasks.data,
    isTasksLoading: tasks.isLoading,
  };
};
