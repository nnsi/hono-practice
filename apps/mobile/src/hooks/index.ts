// Import factory functions from frontend-shared
import {
  createReactNativeEventBusAdapter,
  createReactNativeNotificationAdapter,
  createReactNativeStorageAdapter,
  createReactNativeTimerAdapter,
} from "@frontend-shared/adapters";
import {
  type GoalFilters,
  createUseActivities,
  createUseActivityBatchData,
  createUseActivityLogs,
  createUseApiKeys,
  createUseAuthLogin,
  createUseCreateActivity,
  createUseCreateActivityLog,
  createUseCreateApiKey,
  createUseCreateGoal,
  createUseCreateTask,
  createUseCreateUserApi,
  createUseDeleteActivity,
  createUseDeleteActivityLog,
  createUseDeleteApiKey,
  createUseDeleteGoal,
  createUseDeleteTask,
  createUseGlobalDate,
  createUseGoal,
  createUseGoalStats,
  createUseGoals,
  createUseGoogleAuth,
  createUseLinkGoogleAccount,
  createUseNetworkStatus,
  createUseSubscription,
  createUseTask,
  createUseTasks,
  createUseTimer,
  createUseUpdateActivity,
  createUseUpdateActivityLog,
  createUseUpdateGoal,
  createUseUpdateTask,
} from "@frontend-shared/hooks";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Alert } from "../utils/AlertWrapper";
import { apiClient } from "../utils/apiClient";

// Create adapters for React Native
const storageAdapter = createReactNativeStorageAdapter(AsyncStorage);
const notificationAdapter = createReactNativeNotificationAdapter(Alert);
const eventBusAdapter = createReactNativeEventBusAdapter();
const timerAdapter = createReactNativeTimerAdapter();

// Create wrapper hooks for React Native

// Timer hook
export function useTimer(activityId: string) {
  return createUseTimer({
    activityId,
    storage: storageAdapter,
    notification: notificationAdapter,
    eventBus: eventBusAdapter,
    timer: timerAdapter,
  });
}

// Network status hook
export function useNetworkStatus() {
  return createUseNetworkStatus({});
}

// Global date hook
export function useGlobalDate() {
  return createUseGlobalDate({ eventBus: eventBusAdapter });
}

// Activities hooks
export function useActivities(date?: Date) {
  return createUseActivities({ apiClient })(date);
}

export function useCreateActivity() {
  return createUseCreateActivity({ apiClient });
}

export function useUpdateActivity() {
  return createUseUpdateActivity({ apiClient });
}

export function useDeleteActivity() {
  return createUseDeleteActivity({ apiClient });
}

// Activity logs hooks
export function useActivityLogs(date: Date) {
  return createUseActivityLogs({ apiClient, date });
}

export function useCreateActivityLog() {
  return createUseCreateActivityLog({ apiClient });
}

export function useUpdateActivityLog() {
  return createUseUpdateActivityLog({ apiClient });
}

export function useDeleteActivityLog() {
  return createUseDeleteActivityLog({ apiClient });
}

// Activity batch data hook
export function useActivityBatchData(params: {
  date: Date;
  includeArchived?: boolean;
}) {
  return createUseActivityBatchData({ apiClient, ...params });
}

// Goals hooks
export function useGoals(filters?: GoalFilters) {
  return createUseGoals({ apiClient, filters });
}

export function useGoal(id: string) {
  const result = createUseGoal({ apiClient, id });
  // Mobile版はundefinedを使用
  return {
    ...result,
    data: result.data === null ? undefined : result.data,
  };
}

export function useCreateGoal() {
  return createUseCreateGoal({ apiClient });
}

export function useUpdateGoal() {
  return createUseUpdateGoal({ apiClient });
}

export function useDeleteGoal() {
  return createUseDeleteGoal({ apiClient });
}

export function useGoalStats(id: string, enabled = true) {
  return createUseGoalStats({ apiClient, id, enabled });
}

// Subscription hook
export function useSubscription() {
  return createUseSubscription({ apiClient });
}

// API Keys hooks
export function useApiKeys() {
  return createUseApiKeys({ apiClient });
}

export function useCreateApiKey() {
  return createUseCreateApiKey({ apiClient });
}

export function useDeleteApiKey() {
  return createUseDeleteApiKey({ apiClient });
}

// Tasks hooks
export function useTasks(options?: { date?: string; isArchived?: boolean }) {
  return createUseTasks({ apiClient, ...options });
}

export function useTask(id: string) {
  return createUseTask({ apiClient, id });
}

export function useCreateTask() {
  return createUseCreateTask({ apiClient });
}

export function useUpdateTask() {
  return createUseUpdateTask({ apiClient });
}

export function useDeleteTask() {
  return createUseDeleteTask({ apiClient });
}

// Auth hooks
export function useAuth() {
  return createUseAuthLogin({ apiClient });
}

export function useGoogleAuth() {
  return createUseGoogleAuth({ apiClient });
}

export function useCreateUser() {
  return createUseCreateUserApi({ apiClient });
}

export function useLinkGoogleAccount() {
  return createUseLinkGoogleAccount({ apiClient });
}

// Re-export feature hooks from frontend-shared
export {
  useActivityCalendar,
  useActivityEdit,
  useActivityLogEdit,
  useActivityRegistPage,
  useActivityStats,
  useAuthInitializer,
  useDailyActivityCreate,
  useDailyPage,
  useDailyTaskActions,
  useGoalDetailModal,
  useLogin,
  useNewGoalCard,
  useNewGoalDialog,
  useNewGoalPage,
  useNewGoalSlot,
  useTaskEditForm,
  useTaskGroup,
  useTasksPage,
  useUserSettings,
} from "@frontend-shared/hooks/feature";

// Export React Native specific feature hooks
export { useTaskActions } from "./feature";
// Export wrapper hooks for React Native
export { useAppSettings } from "./useAppSettings";
