import type { StorageService } from ".";
import type { R2Bucket } from "@cloudflare/workers-types";

export function newR2StorageService(
  bucket: R2Bucket,
  appUrl: string,
): StorageService {
  return {
    upload: async (file, key, options) => {
      const buffer = await file.arrayBuffer();

      const object = await bucket.put(key, buffer, {
        httpMetadata: {
          contentType:
            options?.contentType || file.type || "application/octet-stream",
        },
        customMetadata: options?.metadata,
      });

      if (!object) {
        throw new Error("Failed to upload file to R2");
      }

      return {
        url: `${appUrl}/r2/${key}`,
        key,
        size: object.size,
        contentType:
          object.httpMetadata?.contentType || "application/octet-stream",
      };
    },

    delete: async (key) => {
      await bucket.delete(key);
    },

    getUrl: (key) => {
      return `${appUrl}/r2/${key}`;
    },

    exists: async (key) => {
      const object = await bucket.head(key);
      return object !== null;
    },
  };
}
