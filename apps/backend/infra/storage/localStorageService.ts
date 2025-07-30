import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { StorageService } from ".";

export function newLocalStorageService(
  baseUrl: string,
  uploadDir = "public/uploads",
): StorageService {
  const ensureUploadDir = async () => {
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
  };

  return {
    upload: async (file, key, options) => {
      await ensureUploadDir();

      const buffer = await file.arrayBuffer();
      const filePath = join(uploadDir, key);

      // Ensure parent directory exists
      const parentDir = filePath.substring(0, filePath.lastIndexOf("/"));
      if (parentDir && !existsSync(parentDir)) {
        await mkdir(parentDir, { recursive: true });
      }

      await writeFile(filePath, Buffer.from(buffer));

      // 開発環境では画像をdata URLとして返す
      const dataUrl = `data:${options?.contentType || file.type || "application/octet-stream"};base64,${Buffer.from(buffer).toString("base64")}`;

      return {
        url: dataUrl,
        key,
        size: file.size,
        contentType:
          options?.contentType || file.type || "application/octet-stream",
      };
    },

    delete: async (key) => {
      const filePath = join(uploadDir, key);
      if (existsSync(filePath)) {
        await rm(filePath);
      }
    },

    getUrl: (key) => {
      // 開発環境では保存された画像ファイルを読み込んでdata URLとして返す必要がある
      // しかし、同期的な実装なので、ここでは単純にパスを返す
      return `${baseUrl}/${uploadDir}/${key}`;
    },

    exists: async (key) => {
      const filePath = join(uploadDir, key);
      return existsSync(filePath);
    },
  };
}
