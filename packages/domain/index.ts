// Record types
export type { ActivityRecord, ActivityKindRecord } from "./activity/activityRecord";
export type { ActivityLogRecord } from "./activityLog/activityLogRecord";
export type { GoalRecord } from "./goal/goalRecord";
export type { TaskRecord } from "./task/taskRecord";

// Backwards compat aliases
export type { ActivityRecord as Activity, ActivityKindRecord as ActivityKind } from "./activity/activityRecord";
export type { ActivityLogRecord as ActivityLog } from "./activityLog/activityLogRecord";

// Repository types
export type { ActivityRepository, CreateActivityInput, ActivityIconBlob, ActivityIconDeleteQueueItem } from "./activity/activityRepository";
export type { ActivityLogRepository, CreateActivityLogInput, UpsertActivityLogFromServerInput } from "./activityLog/activityLogRepository";
export type { GoalRepository, CreateGoalInput, UpdateGoalInput } from "./goal/goalRepository";
export type { TaskRepository, CreateTaskInput, UpdateTaskInput } from "./task/taskRepository";

// Sync record types (pure domain types only)
export * from "./sync/syncableRecord";

// Time utilities
export * from "./time";

// CSV utilities
export * from "./csv";

// Image types
export * from "./image";

// Predicates / Sorters / Grouping
export * from "./task/taskPredicates";
export * from "./task/taskSorters";
export * from "./task/taskGrouping";
export * from "./task/types";
export * from "./activity/activitySorters";
export * from "./activityLog/activityLogPredicates";
export * from "./activityLog/activityLogValidation";
export * from "./goal/goalBalance";
export * from "./goal/goalStats";
export * from "./goal/goalPredicates";

// Errors
export { DomainValidateError } from "./errors";
