import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { StorageService } from ".";
import { isPathInsideDir, isRealPathInsideDir } from "./localUploadDataUrl";

export function newLocalStorageService(
  baseUrl: string,
  uploadDir = "public/uploads",
): StorageService {
  const ensureUploadDir = async () => {
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
  };

  // key は DB に保存された iconUrl から復元されるため、`..` で uploads
  // ディレクトリ外のファイルを操作しないよう包含検査する。
  const resolveInsideUploadDir = (key: string): string => {
    const filePath = resolve(uploadDir, key);
    // key が `.` や空のときは uploads ディレクトリ自体を指すので、ファイル操作には渡さない
    if (
      filePath === resolve(uploadDir) ||
      !isPathInsideDir(uploadDir, filePath)
    ) {
      throw new Error("storage key escapes upload directory");
    }
    return filePath;
  };

  // 既存ファイルの操作では symlink の実体も uploads 配下か確認する
  const existsInsideUploadDir = async (filePath: string): Promise<boolean> => {
    if (!existsSync(filePath)) return false;
    return isRealPathInsideDir(uploadDir, filePath);
  };

  return {
    upload: async (file, key, options) => {
      await ensureUploadDir();

      const buffer = await file.arrayBuffer();
      const filePath = resolveInsideUploadDir(key);

      // Ensure parent directory exists
      const parentDir = dirname(filePath);
      if (!existsSync(parentDir)) {
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
      const filePath = resolveInsideUploadDir(key);
      if (await existsInsideUploadDir(filePath)) {
        await rm(filePath);
      }
    },

    getUrl: (key) => {
      // 開発環境では保存された画像ファイルを読み込んでdata URLとして返す必要がある
      // しかし、同期的な実装なので、ここでは単純にパスを返す
      return `${baseUrl}/${uploadDir}/${key}`;
    },

    exists: async (key) => {
      const filePath = resolve(uploadDir, key);
      if (!isPathInsideDir(uploadDir, filePath)) {
        return false;
      }
      return existsInsideUploadDir(filePath);
    },
  };
}
