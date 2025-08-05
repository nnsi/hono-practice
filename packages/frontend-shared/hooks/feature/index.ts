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
