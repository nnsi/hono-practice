// Feature Hooks
// このディレクトリにはWeb/Mobile共通のfeature層フックを配置します

// Platform-specific dependencies will be injected through adapters
// to ensure clean separation between business logic and platform code

// Export all feature hooks here as they are implemented
export { createUseActivityEdit } from "./useActivityEdit";
export type { ActivityEditDependencies } from "./useActivityEdit";

export { createUseDailyPage } from "./useDailyPage";
export type { DailyPageDependencies } from "./useDailyPage";

export {
  createUseTasksPage,
  groupTasksByTimeline,
  getTaskStatus,
} from "./useTasksPage";
export type {
  TasksPageDependencies,
  GroupedTasks,
  TaskGroupingOptions,
} from "./useTasksPage";

export { createUseLogin, createLoginValidation } from "./useLogin";
export type { LoginDependencies, GoogleCredentialResponse } from "./useLogin";

export { createUseUserSettings } from "./useUserSettings";
export type { UserSettingsDependencies, UserInfo } from "./useUserSettings";

export {
  createUseActivityStats,
  getColorForKind,
  getUniqueColorForKind,
} from "./useActivityStats";
export type {
  ActivityStatsDependencies,
  UseActivityStatsReturn,
  GoalLine,
} from "./useActivityStats";

export { createUseActivityCalendar } from "./useActivityCalendar";
export type { UseActivityCalendarReturn } from "./useActivityCalendar";

export { createUseTaskGroup } from "./useTaskGroup";
export type {
  TaskGroupDependencies,
  UseTaskGroupReturn,
  TaskItem,
} from "./useTaskGroup";

export { createUseActivityLogEdit } from "./useActivityLogEdit";
export type {
  ActivityLogEditDependencies,
  UseActivityLogEditReturn,
} from "./useActivityLogEdit";

export { createUseActivityRegistPage } from "./useActivityRegistPage";
export type { ActivityRegistPageDependencies } from "./useActivityRegistPage";

export { createUseNewGoalPage } from "./useNewGoalPage";
export type { GoalPageDependencies } from "./useNewGoalPage";

export { createUseTaskActions } from "./useTaskActions";

export { createUseDailyTaskActions } from "./useDailyTaskActions";

export {
  createUseTaskEditForm,
  updateTaskSchema,
  type UpdateTaskFormData,
} from "./useTaskEditForm";

export { createUseDailyActivityCreate } from "./useDailyActivityCreate";

export { createUseAppSettings } from "./useAppSettings";

export { createUseNewGoalCard } from "./useNewGoalCard";

export { createUseNewGoalDialog, type GoalFormData } from "./useNewGoalDialog";

export { createUseNewGoalSlot } from "./useNewGoalSlot";

export { createUseGoalDetailModal } from "./useGoalDetailModal";

export { createUseCreateUser } from "./useCreateUser";

export { createUseAuthInitializer } from "./useAuthInitializer";
