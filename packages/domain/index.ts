// Sync Records (後方互換: Activity, ActivityKind, ActivityLog の名前で re-export)
export type { ActivityRecord as Activity, ActivityKindRecord as ActivityKind } from "./activity/activityRecord";
export type { ActivityLogRecord as ActivityLog } from "./activityLog/activityLogRecord";

// Record types
export type { ActivityRecord, ActivityKindRecord } from "./activity/activityRecord";
export type { ActivityLogRecord } from "./activityLog/activityLogRecord";
export type { GoalRecord } from "./goal/goalRecord";
export type { TaskRecord } from "./task/taskRecord";

// Repository types
export type { ActivityRepository, CreateActivityInput, ActivityIconBlob, ActivityIconDeleteQueueItem } from "./activity/activityRepository";
export type { ActivityLogRepository, CreateActivityLogInput } from "./activityLog/activityLogRepository";
export type { GoalRepository, CreateGoalInput, UpdateGoalInput } from "./goal/goalRepository";
export type { TaskRepository, CreateTaskInput, UpdateTaskInput } from "./task/taskRepository";

// Sync types
export * from "./sync";

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
