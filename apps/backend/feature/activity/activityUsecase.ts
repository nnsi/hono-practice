import { AppError, ResourceNotFoundError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import type { StorageService } from "@backend/infra/storage";
import { type Logger, noopLogger } from "@backend/lib/logger";
import type { Tracer } from "@backend/lib/tracer";
import { generateIconKey } from "@backend/utils/imageValidator";
import {
  type Activity,
  type ActivityId,
  createActivityEntity,
  createActivityId,
  createActivityKindId,
} from "@packages/domain/activity/activitySchema";
import type { UserId } from "@packages/domain/user/userSchema";
import type {
  CreateActivityRequest,
  UpdateActivityOrderRequest,
  UpdateActivityRequest,
} from "@packages/types/request";
import { generateOrder } from "@packages/utils/lexicalOrder";

import type { ActivityRepository } from ".";

type UploadActivityIconResult = {
  iconUrl: string;
  iconThumbnailUrl: string;
};

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

function getActivities(repo: ActivityRepository, tracer: Tracer) {
  return async (userId: UserId) => {
    const activity = await tracer.span("db.getActivitiesByUserId", () =>
      repo.getActivitiesByUserId(userId),
    );

    return activity;
  };
}

function getActivity(repo: ActivityRepository, tracer: Tracer) {
  return async (userId: UserId, activityId: ActivityId) => {
    const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
      repo.getActivityByIdAndUserId(userId, activityId),
    );
    if (!activity) throw new ResourceNotFoundError("activity not found");

    return activity;
  };
}

function createActivity(
  repo: ActivityRepository,
  tx: TransactionRunner,
  tracer: Tracer,
) {
  return async (userId: UserId, params: CreateActivityRequest) => {
    return tx.run([repo], async (txRepo) => {
      const lastOrderIndex = await tracer.span(
        "db.getLastOrderIndexByUserId",
        () => txRepo.getLastOrderIndexByUserId(userId),
      );

      const orderIndex = generateOrder(lastOrderIndex ?? "", null);

      const kinds = (params.kinds ?? []).map((k) => ({
        id: createActivityKindId(),
        name: k.name,
        orderIndex: null,
        color: k.color,
      }));

      const activity = createActivityEntity({
        id: createActivityId(),
        userId: userId,
        name: params.name,
        label: params.label,
        emoji: params.emoji,
        iconType: params.iconType || "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        description: params.description,
        quantityUnit: params.quantityUnit,
        orderIndex: orderIndex,
        showCombinedStats: params.showCombinedStats ?? true,
        recordingMode: params.recordingMode ?? "manual",
        recordingModeConfig: params.recordingModeConfig,
        kinds,
        type: "new",
      });

      return await tracer.span("db.createActivity", () =>
        txRepo.createActivity(activity),
      );
    });
  };
}

function updateActivity(
  repo: ActivityRepository,
  tx: TransactionRunner,
  tracer: Tracer,
) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    params: UpdateActivityRequest,
  ) => {
    return tx.run([repo], async (txRepo) => {
      const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
        txRepo.getActivityByIdAndUserId(userId, activityId),
      );
      if (!activity) throw new ResourceNotFoundError("activity not found");

      const inputKinds = params.kinds.map((k) => {
        return {
          id: k.id ?? createActivityKindId(),
          name: k.name,
          color: k.color,
        };
      });

      const kinds = inputKinds;

      const newActivity = createActivityEntity({
        ...activity,
        ...params.activity,
        showCombinedStats:
          params.activity.showCombinedStats ?? activity.showCombinedStats,
        kinds,
      });

      return await tracer.span("db.updateActivity", () =>
        txRepo.updateActivity(newActivity),
      );
    });
  };
}

function updateActivityOrder(
  repo: ActivityRepository,
  tx: TransactionRunner,
  tracer: Tracer,
) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    params: UpdateActivityOrderRequest,
  ) => {
    const typedPrevId = params.prev ? createActivityId(params.prev) : undefined;
    const typedNextId = params.next ? createActivityId(params.next) : undefined;

    const ids = [activityId, typedPrevId, typedNextId].filter(
      (x): x is ActivityId => Boolean(x),
    );

    return tx.run([repo], async (txRepo) => {
      const activities = await tracer.span(
        "db.getActivitiesByIdsAndUserId",
        () => txRepo.getActivitiesByIdsAndUserId(userId, ids),
      );

      const activity = activities.find((a) => a.id === activityId);
      if (!activity) throw new ResourceNotFoundError("activity not found");

      const prevActivity = activities.find((a) => a.id === typedPrevId);
      const nextActivity = activities.find((a) => a.id === typedNextId);

      const orderIndex = generateOrder(
        prevActivity?.orderIndex,
        nextActivity?.orderIndex,
      );

      activity.orderIndex = orderIndex;

      return await tracer.span("db.updateActivity", () =>
        txRepo.updateActivity(activity),
      );
    });
  };
}

function deleteActivity(repo: ActivityRepository, tracer: Tracer) {
  return async (userId: UserId, activityId: ActivityId) => {
    const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
      repo.getActivityByIdAndUserId(userId, activityId),
    );
    if (!activity) throw new ResourceNotFoundError("activity not found");

    return await tracer.span("db.deleteActivity", () =>
      repo.deleteActivity(activity),
    );
  };
}

const ALLOWED_ICON_TYPES = ["image/jpeg", "image/png", "image/webp"];

function extractStorageKey(url: string): string {
  const match = url.match(/\/r2\/(.+)$/);
  if (match) return match[1];

  const localMatch = url.match(/\/public\/uploads\/(.+)$/);
  if (localMatch) return localMatch[1];

  return url.split("/").slice(-3).join("/");
}

function uploadActivityIcon(
  repo: ActivityRepository,
  tracer: Tracer,
  logger: Logger,
  storage?: StorageService,
) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    base64: string,
    mimeType: string,
    apiBaseUrl: string,
  ): Promise<UploadActivityIconResult> => {
    if (!storage) throw new AppError("Storage service is not configured", 500);

    if (!ALLOWED_ICON_TYPES.includes(mimeType)) {
      throw new AppError("Invalid image type", 400);
    }

    // 所有権チェック
    const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
      repo.getActivityByIdAndUserId(userId, activityId),
    );
    if (!activity) throw new ResourceNotFoundError("activity not found");

    // Base64 → バイナリ変換
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const file = new File([bytes], "icon.webp", { type: mimeType });
    const mainKey = generateIconKey(userId, activityId);

    // R2アップロード
    const uploaded = await tracer.span("r2.upload", () =>
      storage.upload(file, mainKey, { contentType: mimeType }),
    );

    // 相対URLを絶対URLに変換
    const storageUrl = storage.getUrl(uploaded.key);
    const iconUrl = storageUrl.startsWith("/")
      ? `${apiBaseUrl}${storageUrl}`
      : storageUrl;
    const iconThumbnailUrl = iconUrl;

    try {
      await tracer.span("db.updateActivityIcon", () =>
        repo.updateActivityIcon(
          activityId,
          "upload",
          iconUrl,
          iconThumbnailUrl,
        ),
      );
    } catch (error) {
      try {
        await tracer.span("r2.delete.compensation", () =>
          storage.delete(uploaded.key),
        );
      } catch (compensationError) {
        logger.error("Failed to rollback uploaded activity icon", {
          activityId,
          uploadedKey: uploaded.key,
          error:
            compensationError instanceof Error
              ? compensationError.message
              : String(compensationError),
        });
      }
      throw error;
    }

    return { iconUrl, iconThumbnailUrl };
  };
}

function deleteActivityIcon(
  repo: ActivityRepository,
  tracer: Tracer,
  logger: Logger,
  storage?: StorageService,
) {
  return async (userId: UserId, activityId: ActivityId): Promise<void> => {
    if (!storage) throw new AppError("Storage service is not configured", 500);

    const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
      repo.getActivityByIdAndUserId(userId, activityId),
    );
    if (!activity) throw new ResourceNotFoundError("activity not found");

    const iconEntries = [
      activity.iconUrl
        ? { url: activity.iconUrl, key: extractStorageKey(activity.iconUrl) }
        : null,
      activity.iconThumbnailUrl
        ? {
            url: activity.iconThumbnailUrl,
            key: extractStorageKey(activity.iconThumbnailUrl),
          }
        : null,
    ].filter((entry): entry is { url: string; key: string } => Boolean(entry));
    const deleteKeys = [...new Set(iconEntries.map((entry) => entry.key))];
    const deletedKeys: string[] = [];

    await tracer.span("db.updateActivityIcon", () =>
      repo.updateActivityIcon(activityId, "emoji", null, null),
    );

    try {
      for (const key of deleteKeys) {
        await tracer.span("r2.delete", () => storage.delete(key));
        deletedKeys.push(key);
      }
    } catch (error) {
      const remainingKeys = deleteKeys.filter(
        (key) => !deletedKeys.includes(key),
      );

      if (deletedKeys.length === 0) {
        try {
          await tracer.span("db.updateActivityIcon.rollback", () =>
            repo.updateActivityIcon(
              activityId,
              activity.iconType,
              activity.iconUrl,
              activity.iconThumbnailUrl,
            ),
          );
        } catch (rollbackError) {
          logger.error("Failed to rollback activity icon metadata", {
            activityId,
            deletedKeys,
            remainingKeys,
            deleteError: error instanceof Error ? error.message : String(error),
            rollbackError:
              rollbackError instanceof Error
                ? rollbackError.message
                : String(rollbackError),
          });
        }
      } else {
        logger.error("Failed to fully delete activity icon from storage", {
          activityId,
          deletedKeys,
          remainingKeys,
          deleteError: error instanceof Error ? error.message : String(error),
        });
      }
      throw new AppError("Failed to delete activity icon from storage", 500);
    }

    // emojiにリセット
  };
}
