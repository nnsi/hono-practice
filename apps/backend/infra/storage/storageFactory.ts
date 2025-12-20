import type { AppContext } from "@backend/context";

import type { StorageService } from ".";
import { newLocalStorageService } from "./localStorageService";
import { newR2StorageService } from "./r2StorageService";

export function createStorageService(
  env: AppContext["Bindings"],
): StorageService {
  if (env.STORAGE_TYPE === "r2") {
    if (!env.R2_BUCKET) {
      throw new Error("R2 bucket is required when STORAGE_TYPE is 'r2'");
    }
    return newR2StorageService(env.R2_BUCKET);
  }

  return newLocalStorageService(env.APP_URL, env.UPLOAD_DIR);
}
