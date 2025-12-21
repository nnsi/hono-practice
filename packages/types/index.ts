// Re-export types from backend domain
export type { Activity } from "@backend/domain/activity";
export type { ActivityGoal as Goal } from "@backend/domain/activitygoal/activityGoal";
export type { ActivityLog } from "@backend/domain/activityLog";
export type { Task } from "@backend/domain/task";
export type { User } from "@backend/domain/user";

export * from "./request";
export * from "./response";
