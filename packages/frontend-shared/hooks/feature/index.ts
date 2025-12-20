// Feature Hooks
// このディレクトリにはWeb/Mobile共通のfeature層フックを配置します

// Platform-specific dependencies will be injected through adapters
// to ensure clean separation between business logic and platform code

export type { UseActivityCalendarReturn } from "./useActivityCalendar";
export { createUseActivityCalendar } from "./useActivityCalendar";
export type { ActivityEditDependencies } from "./useActivityEdit";
// Export all feature hooks here as they are implemented
export { createUseActivityEdit } from "./useActivityEdit";
export type {
  ActivityLogEditDependencies,
  UseActivityLogEditReturn,
} from "./useActivityLogEdit";
export { createUseActivityLogEdit } from "./useActivityLogEdit";
export type { ActivityRegistPageDependencies } from "./useActivityRegistPage";
export { createUseActivityRegistPage } from "./useActivityRegistPage";
export type {
  ActivityStatsDependencies,
  GoalLine,
  UseActivityStatsReturn,
} from "./useActivityStats";
export {
  createUseActivityStats,
  getColorForKind,
  getUniqueColorForKind,
} from "./useActivityStats";
export { createUseAppSettings } from "./useAppSettings";
export { createUseAuthInitializer } from "./useAuthInitializer";
export { createUseCreateUser } from "./useCreateUser";
export { createUseDailyActivityCreate } from "./useDailyActivityCreate";
export type { DailyPageDependencies } from "./useDailyPage";
export { createUseDailyPage } from "./useDailyPage";
export { createUseDailyTaskActions } from "./useDailyTaskActions";
export { createUseGoalDetailModal } from "./useGoalDetailModal";
export type { GoogleCredentialResponse, LoginDependencies } from "./useLogin";
export { createLoginValidation, createUseLogin } from "./useLogin";
export { createUseNewGoalCard } from "./useNewGoalCard";
export { type GoalFormData, createUseNewGoalDialog } from "./useNewGoalDialog";
export type { GoalPageDependencies } from "./useNewGoalPage";
export { createUseNewGoalPage } from "./useNewGoalPage";
export { createUseNewGoalSlot } from "./useNewGoalSlot";
export { createUseTaskActions } from "./useTaskActions";
export {
  type UpdateTaskFormData,
  createUseTaskEditForm,
  updateTaskSchema,
} from "./useTaskEditForm";
export type {
  TaskGroupDependencies,
  TaskItem,
  UseTaskGroupReturn,
} from "./useTaskGroup";
export { createUseTaskGroup } from "./useTaskGroup";
export type {
  GroupedTasks,
  TaskGroupingOptions,
  TasksPageDependencies,
} from "./useTasksPage";
export {
  createUseTasksPage,
  getTaskStatus,
  groupTasksByTimeline,
} from "./useTasksPage";
export type { UserInfo, UserSettingsDependencies } from "./useUserSettings";
export { createUseUserSettings } from "./useUserSettings";
