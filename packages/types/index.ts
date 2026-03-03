// Re-export types from packages domain
export type { Activity } from "@packages/domain/activity/activitySchema";
export type { ActivityLog } from "@packages/domain/activityLog/activityLogSchema";
export type { ActivityGoal as Goal } from "@packages/domain/goal/goalSchema";
export type { Task } from "@packages/domain/task/taskSchema";
export type { User } from "@packages/domain/user/userSchema";

export * from "./request";
export * from "./response";
// V2 sync types (previously in @packages/types-v2)
export * from "./sync";
