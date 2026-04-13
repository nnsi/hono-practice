import type { TransactionRunner } from "@backend/infra/rdb/db";
import type { StorageService } from "@backend/infra/storage";
import { type Logger, noopLogger } from "@backend/lib/logger";
import type { Tracer } from "@backend/lib/tracer";
import type {
  Activity,
  ActivityId,
} from "@packages/domain/activity/activitySchema";
import type { UserId } from "@packages/domain/user/userSchema";
import type {
  CreateActivityRequest,
  UpdateActivityOrderRequest,
  UpdateActivityRequest,
} from "@packages/types/request";

import {
  type UploadActivityIconResult,
  deleteActivityIcon,
  uploadActivityIcon,
} from "./activityIconUsecase";
import { getActivities, getActivity } from "./activityReadUsecase";
import type { ActivityRepository } from "./activityRepository";
import {
  createActivity,
  deleteActivity,
  updateActivity,
  updateActivityOrder,
} from "./activityWriteUsecase";

export type ActivityUsecase = {
  getActivities(userId: UserId): Promise<Activity[]>;
  getActivity(userId: UserId, activityId: ActivityId): Promise<Activity>;
  createActivity(userId: UserId, req: CreateActivityRequest): Promise<Activity>;
  updateActivity(
    userId: UserId,
    activityId: ActivityId,
    req: UpdateActivityRequest,
  ): Promise<Activity>;
  updateActivityOrder(
    userId: UserId,
    activityId: ActivityId,
    orderIndexes: UpdateActivityOrderRequest,
  ): Promise<Activity>;
  deleteActivity(userId: UserId, activityId: ActivityId): Promise<void>;
  uploadActivityIcon(
    userId: UserId,
    activityId: ActivityId,
    base64: string,
    mimeType: string,
    apiBaseUrl: string,
  ): Promise<UploadActivityIconResult>;
  deleteActivityIcon(userId: UserId, activityId: ActivityId): Promise<void>;
};

export function newActivityUsecase(
  repo: ActivityRepository,
  tx: TransactionRunner,
  tracer: Tracer,
  storage?: StorageService,
  logger: Logger = noopLogger,
): ActivityUsecase {
  const activityLogger = logger.child({ feature: "activityUsecase" });
  return {
    getActivities: getActivities(repo, tracer),
    getActivity: getActivity(repo, tracer),
    createActivity: createActivity(repo, tx, tracer),
    updateActivity: updateActivity(repo, tx, tracer),
    updateActivityOrder: updateActivityOrder(repo, tx, tracer),
    deleteActivity: deleteActivity(repo, tracer),
    uploadActivityIcon: uploadActivityIcon(
      repo,
      tracer,
      activityLogger,
      storage,
    ),
    deleteActivityIcon: deleteActivityIcon(
      repo,
      tracer,
      activityLogger,
      storage,
    ),
  };
}
