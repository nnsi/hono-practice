// Feature Hooks
// このディレクトリにはWeb/Mobile共通のfeature層フックを配置します

// Platform-specific dependencies will be injected through adapters
// to ensure clean separation between business logic and platform code

export type {
  ActivityCalendarActions,
  ActivityCalendarStateProps,
  UseActivityCalendarReturn,
} from "./useActivityCalendar";
export { createUseActivityCalendar } from "./useActivityCalendar";
export type { ActivityEditDependencies } from "./useActivityEdit";
// Export all feature hooks here as they are implemented
export { createUseActivityEdit } from "./useActivityEdit";
export type {
  ActivityLogEditActions,
  ActivityLogEditDependencies,
  ActivityLogEditFormProps,
  UseActivityLogEditReturn,
} from "./useActivityLogEdit";
export { createUseActivityLogEdit } from "./useActivityLogEdit";
export type {
  ActivityRegistPageActions,
  ActivityRegistPageDependencies,
  ActivityRegistPageStateProps,
  UseActivityRegistPageReturn,
} from "./useActivityRegistPage";
export { createUseActivityRegistPage } from "./useActivityRegistPage";
export type {
  ActivityStatsActions,
  ActivityStatsDependencies,
  ActivityStatsStateProps,
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
export type {
  DailyActivityCreateActions,
  DailyActivityCreateStateProps,
  UseDailyActivityCreateReturn,
} from "./useDailyActivityCreate";
export { createUseDailyActivityCreate } from "./useDailyActivityCreate";
export type {
  DailyPageActions,
  DailyPageDependencies,
  DailyPageStateProps,
  UseDailyPageReturn,
} from "./useDailyPage";
export { createUseDailyPage } from "./useDailyPage";
export type {
  DailyTaskActionsActions,
  DailyTaskActionsStateProps,
  UseDailyTaskActionsReturn,
} from "./useDailyTaskActions";
export { createUseDailyTaskActions } from "./useDailyTaskActions";
export { createUseGoalDetailModal } from "./useGoalDetailModal";
export type { GoogleCredentialResponse, LoginDependencies } from "./useLogin";
export { createLoginValidation, createUseLogin } from "./useLogin";
export { createUseNewGoalCard } from "./useNewGoalCard";
export type {
  GoalFormData,
  NewGoalDialogActions,
  NewGoalDialogStateProps,
  UseNewGoalDialogReturn,
} from "./useNewGoalDialog";
export { createUseNewGoalDialog } from "./useNewGoalDialog";
export type {
  GoalPageDependencies,
  NewGoalPageActions,
  NewGoalPageStateProps,
  UseNewGoalPageReturn,
} from "./useNewGoalPage";
export { createUseNewGoalPage } from "./useNewGoalPage";
export { createUseNewGoalSlot } from "./useNewGoalSlot";
export type {
  TaskActionsActions,
  TaskActionsStateProps,
  UseTaskActionsReturn,
} from "./useTaskActions";
export { createUseTaskActions } from "./useTaskActions";
export type {
  TaskEditFormActions,
  TaskEditFormStateProps,
  UpdateTaskFormData,
  UseTaskEditFormReturn,
} from "./useTaskEditForm";
export { createUseTaskEditForm, updateTaskSchema } from "./useTaskEditForm";
export type {
  TaskGroupActions,
  TaskGroupDependencies,
  TaskGroupStateProps,
  TaskItem,
  UseTaskGroupReturn,
} from "./useTaskGroup";
export { createUseTaskGroup } from "./useTaskGroup";
export type {
  GroupedTasks,
  TaskGroupingOptions,
  TasksPageActions,
  TasksPageDependencies,
  TasksPageStateProps,
  UseTasksPageReturn,
} from "./useTasksPage";
export {
  createUseTasksPage,
  getTaskStatus,
  groupTasksByTimeline,
} from "./useTasksPage";
export type { UserInfo, UserSettingsDependencies } from "./useUserSettings";
export { createUseUserSettings } from "./useUserSettings";
