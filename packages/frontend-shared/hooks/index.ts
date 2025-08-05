// Export all shared hooks
export {
  createUseTimer,
  type UseTimerOptions,
  type UseTimerReturn,
} from "./useTimer";
export {
  createUseNetworkStatus,
  setSimulatedOffline,
  getSimulatedOffline,
  type UseNetworkStatusOptions,
  type UseNetworkStatusReturn,
} from "./useNetworkStatus";
export {
  createUseGlobalDate,
  type UseGlobalDateOptions,
  type UseGlobalDateReturn,
} from "./useGlobalDate";
export {
  createUseActivities,
  type UseActivitiesOptions,
  type UseActivitiesReturn,
} from "./useActivities";
export {
  createUseGoals,
  createUseGoal,
  createUseCreateGoal,
  createUseUpdateGoal,
  createUseDeleteGoal,
  createUseGoalStats,
  type GoalFilters,
  type UseGoalsOptions,
  type UseGoalOptions,
  type UseGoalStatsOptions,
  type MutationOptions as UseGoalMutationOptions,
} from "./useGoals";
export {
  createUseSubscription,
  type UseSubscriptionOptions,
} from "./useSubscription";
export {
  createUseApiKeys,
  createUseCreateApiKey,
  createUseDeleteApiKey,
  type UseApiKeysOptions,
  type ApiKeyMutationOptions,
} from "./useApiKeys";
export {
  createUseTasks,
  createUseArchivedTasks,
  createUseTask,
  createUseCreateTask,
  createUseUpdateTask,
  createUseDeleteTask,
  createUseArchiveTask,
  type UseTasksOptions,
  type UseArchivedTasksOptions,
  type UseTaskOptions,
  type MutationOptions as UseTaskMutationOptions,
} from "./useTasks";
