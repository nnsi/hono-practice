import { convertLocalUploadUrlToDataUrl } from "@backend/infra/storage/localUploadDataUrl";
import { noopLogger } from "@backend/lib/logger";

import type { AppContext } from "../context";

type IconUrls = {
  iconUrl?: string | null;
  iconThumbnailUrl?: string | null;
};

/**
 * ローカル環境で activity の iconUrl / iconThumbnailUrl を Base64 data URL に変換する。
 * activity 単体・activityLog 内ネストの双方で再利用する共通ヘルパー。
 */
export async function convertActivityIconUrls<T extends IconUrls>(
  activity: T,
  env: AppContext["Bindings"],
  logger = noopLogger,
): Promise<T> {
  const options = {
    isDevelopment: env.NODE_ENV === "development",
    uploadDir: env.UPLOAD_DIR,
    logger,
    warnMessage: "Failed to convert activity icon URL to base64",
  };

  return {
    ...activity,
    iconUrl: await convertLocalUploadUrlToDataUrl(activity.iconUrl, options),
    iconThumbnailUrl: await convertLocalUploadUrlToDataUrl(
      activity.iconThumbnailUrl,
      options,
    ),
  };
}
