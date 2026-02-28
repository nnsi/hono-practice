import {
  type Activity,
  type ActivityId,
  createActivityEntity,
  createActivityId,
  createActivityKindId,
} from "@packages/domain/activity/activitySchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { AppError, ResourceNotFoundError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import type { StorageService } from "@backend/infra/storage";
import { generateOrder } from "@backend/lib/lexicalOrder";
import type { Tracer } from "@backend/lib/tracer";
import { generateIconKey } from "@backend/utils/imageValidator";
import type {
  CreateActivityRequest,
  UpdateActivityOrderRequest,
  UpdateActivityRequest,
} from "@dtos/request";

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
  deleteActivityIcon(
    userId: UserId,
    activityId: ActivityId,
  ): Promise<void>;
};

export function newActivityUsecase(
  repo: ActivityRepository,
  tx: TransactionRunner,
  tracer: Tracer,
  storage?: StorageService,
): ActivityUsecase {
  return {
    getActivities: getActivities(repo, tracer),
    getActivity: getActivity(repo, tracer),
    createActivity: createActivity(repo, tx, tracer),
    updateActivity: updateActivity(repo, tx, tracer),
    updateActivityOrder: updateActivityOrder(repo, tx, tracer),
    deleteActivity: deleteActivity(repo, tracer),
    uploadActivityIcon: uploadActivityIcon(repo, tracer, storage),
    deleteActivityIcon: deleteActivityIcon(repo, tracer, storage),
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

      const kinds = inputKinds.length > 0 ? inputKinds : activity.kinds;

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
      Boolean,
    ) as ActivityId[];

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

function extractR2Key(url: string): string {
  const match = url.match(/\/r2\/(.+)$/);
  return match ? match[1] : url.split("/").slice(-4).join("/");
}

function uploadActivityIcon(
  repo: ActivityRepository,
  tracer: Tracer,
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
    const iconUrl = uploaded.url.startsWith("/")
      ? `${apiBaseUrl}${uploaded.url}`
      : uploaded.url;
    const iconThumbnailUrl = iconUrl;

    // DB更新
    await tracer.span("db.updateActivityIcon", () =>
      repo.updateActivityIcon(activityId, "upload", iconUrl, iconThumbnailUrl),
    );

    return { iconUrl, iconThumbnailUrl };
  };
}

function deleteActivityIcon(
  repo: ActivityRepository,
  tracer: Tracer,
  storage?: StorageService,
) {
  return async (userId: UserId, activityId: ActivityId): Promise<void> => {
    if (!storage) throw new AppError("Storage service is not configured", 500);

    const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
      repo.getActivityByIdAndUserId(userId, activityId),
    );
    if (!activity) throw new ResourceNotFoundError("activity not found");

    // R2からアイコンを削除
    if (activity.iconUrl) {
      const key = extractR2Key(activity.iconUrl);
      try {
        await tracer.span("r2.delete", () => storage.delete(key));
      } catch (error) {
        console.error("Failed to delete main icon:", error);
      }
    }

    if (
      activity.iconThumbnailUrl &&
      activity.iconThumbnailUrl !== activity.iconUrl
    ) {
      const key = extractR2Key(activity.iconThumbnailUrl);
      try {
        await tracer.span("r2.delete", () => storage.delete(key));
      } catch (error) {
        console.error("Failed to delete thumbnail icon:", error);
      }
    }

    // emojiにリセット
    await tracer.span("db.updateActivityIcon", () =>
      repo.updateActivityIcon(activityId, "emoji", null, null),
    );
  };
}
