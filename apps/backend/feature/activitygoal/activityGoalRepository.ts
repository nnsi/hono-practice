import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { ActivityId } from "@packages/domain/activity/activitySchema";
import type {
  ActivityGoal,
  ActivityGoalId,
} from "@packages/domain/goal/goalSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import {
  getActiveActivityGoalByActivityId,
  getActivityGoalByIdAndUserId,
  getActivityGoalChangesAfter,
  getActivityGoalsByActivityId,
  getActivityGoalsByUserId,
} from "./activityGoalQueryRepository";
import {
  createActivityGoal,
  deleteActivityGoal,
  hardDeleteActivityGoalsByUserId,
  updateActivityGoal,
} from "./activityGoalWriteRepository";

export type ActivityGoalRepository<T = QueryExecutor> = {
  getActivityGoalsByUserId(userId: UserId): Promise<ActivityGoal[]>;
  getActivityGoalByIdAndUserId(
    id: ActivityGoalId,
    userId: UserId,
  ): Promise<ActivityGoal | undefined>;
  getActivityGoalsByActivityId(
    userId: UserId,
    activityId: ActivityId,
  ): Promise<ActivityGoal[]>;
  getActiveActivityGoalByActivityId(
    userId: UserId,
    activityId: ActivityId,
  ): Promise<ActivityGoal | undefined>;
  createActivityGoal(goal: ActivityGoal): Promise<ActivityGoal>;
  updateActivityGoal(goal: ActivityGoal): Promise<ActivityGoal>;
  deleteActivityGoal(goal: ActivityGoal): Promise<void>;
  getActivityGoalChangesAfter(
    userId: UserId,
    timestamp: Date,
    limit?: number,
  ): Promise<{ goals: ActivityGoal[]; hasMore: boolean }>;
  hardDeleteActivityGoalsByUserId(userId: UserId): Promise<number>;
  withTx(tx: T): ActivityGoalRepository<T>;
};

export function newActivityGoalRepository(
  db: QueryExecutor,
): ActivityGoalRepository<QueryExecutor> {
  return {
    getActivityGoalsByUserId: getActivityGoalsByUserId(db),
    getActivityGoalByIdAndUserId: getActivityGoalByIdAndUserId(db),
    getActivityGoalsByActivityId: getActivityGoalsByActivityId(db),
    getActiveActivityGoalByActivityId: getActiveActivityGoalByActivityId(db),
    createActivityGoal: createActivityGoal(db),
    updateActivityGoal: updateActivityGoal(db),
    deleteActivityGoal: deleteActivityGoal(db),
    getActivityGoalChangesAfter: getActivityGoalChangesAfter(db),
    hardDeleteActivityGoalsByUserId: hardDeleteActivityGoalsByUserId(db),
    withTx: (tx) => newActivityGoalRepository(tx),
  };
}
