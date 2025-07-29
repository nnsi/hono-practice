
import { newLocalStorageService } from "./localStorageService";
import { newR2StorageService } from "./r2StorageService";

import type { StorageService } from ".";
import type { AppContext } from "@backend/context";

export function createStorageService(
  env: AppContext["Bindings"],
): StorageService {
  if (env.STORAGE_TYPE === "r2") {
    if (!env.R2_BUCKET) {
      throw new Error("R2 bucket is required when STORAGE_TYPE is 'r2'");
    }
    if (!env.R2_PUBLIC_URL) {
      throw new Error("R2_PUBLIC_URL is required when STORAGE_TYPE is 'r2'");
    }
    return newR2StorageService(env.R2_BUCKET, env.R2_PUBLIC_URL);
  }

  return newLocalStorageService(env.APP_URL, env.UPLOAD_DIR);
}
