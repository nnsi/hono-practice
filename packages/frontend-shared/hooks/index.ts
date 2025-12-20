// Export all shared hooks

export {
  type UseActivitiesOptions,
  type UseActivitiesReturn,
  createUseActivities,
} from "./useActivities";
export {
  type UseActivityBatchDataOptions,
  createUseActivityBatchData,
} from "./useActivityBatchData";
export {
  type CreateActivityLogOptions,
  type DeleteActivityLogOptions,
  type UpdateActivityLogOptions,
  type UseActivityLogsOptions,
  createUseActivityLogs,
  createUseCreateActivityLog,
  createUseDeleteActivityLog,
  createUseUpdateActivityLog,
} from "./useActivityLogs";
export {
  type UseActivityMutationsOptions,
  createUseCreateActivity,
  createUseDeleteActivity,
  createUseUpdateActivity,
} from "./useActivityMutations";
export {
  type ApiKeyMutationOptions,
  type UseApiKeysOptions,
  createUseApiKeys,
  createUseCreateApiKey,
  createUseDeleteApiKey,
} from "./useApiKeys";
export {
  type UseAuthOptions,
  createUseAuthLogin,
  createUseCreateUserApi,
  createUseGoogleAuth,
  createUseLinkGoogleAccount,
} from "./useAuth";
export {
  type UseGlobalDateOptions,
  type UseGlobalDateReturn,
  createUseGlobalDate,
} from "./useGlobalDate";
export {
  type GoalFilters,
  type MutationOptions as UseGoalMutationOptions,
  type UseGoalOptions,
  type UseGoalStatsOptions,
  type UseGoalsOptions,
  createUseCreateGoal,
  createUseDeleteGoal,
  createUseGoal,
  createUseGoalStats,
  createUseGoals,
  createUseUpdateGoal,
} from "./useGoals";
export {
  type UseNetworkStatusOptions,
  type UseNetworkStatusReturn,
  createUseNetworkStatus,
  getSimulatedOffline,
  setSimulatedOffline,
} from "./useNetworkStatus";
export {
  type UseSubscriptionOptions,
  createUseSubscription,
} from "./useSubscription";
export {
  type MutationOptions as UseTaskMutationOptions,
  type UseArchivedTasksOptions,
  type UseTaskOptions,
  type UseTasksOptions,
  createUseArchiveTask,
  createUseArchivedTasks,
  createUseCreateTask,
  createUseDeleteTask,
  createUseTask,
  createUseTasks,
  createUseUpdateTask,
} from "./useTasks";
export {
  type UseTimerOptions,
  type UseTimerReturn,
  createUseTimer,
} from "./useTimer";
