import { AppError, ResourceNotFoundError } from "@backend/error";
import type { StorageService } from "@backend/infra/storage";
import type { Logger } from "@backend/lib/logger";
import type { Tracer } from "@backend/lib/tracer";
import { generateIconKey } from "@backend/utils/imageValidator";
import type { ActivityId } from "@packages/domain/activity/activitySchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { ActivityRepository } from "./activityRepository";

const ALLOWED_ICON_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type UploadActivityIconResult = {
  iconUrl: string;
  iconThumbnailUrl: string;
};

function extractStorageKey(url: string): string {
  const match = url.match(/\/r2\/(.+)$/);
  if (match) {
    return match[1];
  }

  const localMatch = url.match(/\/public\/uploads\/(.+)$/);
  if (localMatch) {
    return localMatch[1];
  }

  return url.split("/").slice(-3).join("/");
}

export function uploadActivityIcon(
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
    if (!storage) {
      throw new AppError("Storage service is not configured", 500);
    }

    if (!ALLOWED_ICON_TYPES.includes(mimeType)) {
      throw new AppError("Invalid image type", 400);
    }

    const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
      repo.getActivityByIdAndUserId(userId, activityId),
    );
    if (!activity) {
      throw new ResourceNotFoundError("activity not found");
    }

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let index = 0; index < binaryString.length; index++) {
      bytes[index] = binaryString.charCodeAt(index);
    }

    const file = new File([bytes], "icon.webp", { type: mimeType });
    const mainKey = generateIconKey(userId, activityId);
    const uploaded = await tracer.span("r2.upload", () =>
      storage.upload(file, mainKey, { contentType: mimeType }),
    );

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

export function deleteActivityIcon(
  repo: ActivityRepository,
  tracer: Tracer,
  logger: Logger,
  storage?: StorageService,
) {
  return async (userId: UserId, activityId: ActivityId): Promise<void> => {
    if (!storage) {
      throw new AppError("Storage service is not configured", 500);
    }

    const activity = await tracer.span("db.getActivityByIdAndUserId", () =>
      repo.getActivityByIdAndUserId(userId, activityId),
    );
    if (!activity) {
      throw new ResourceNotFoundError("activity not found");
    }

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
  };
}
