import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Logger } from "@backend/lib/logger";

type ConvertLocalUploadUrlToDataUrlOptions = {
  isDevelopment: boolean;
  uploadDir: string;
  logger: Logger;
  warnMessage: string;
};

function inferMimeTypeFromUrl(url: string): string {
  if (url.endsWith(".webp")) return "image/webp";
  if (url.endsWith(".jpg") || url.endsWith(".jpeg")) return "image/jpeg";
  if (url.endsWith(".png")) return "image/png";
  if (url.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

function normalizeUploadDir(uploadDir: string): string {
  return uploadDir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

export async function convertLocalUploadUrlToDataUrl(
  url: string | null | undefined,
  options: ConvertLocalUploadUrlToDataUrlOptions,
): Promise<string | null | undefined> {
  if (!options.isDevelopment) {
    return url;
  }

  const normalizedUploadDir = normalizeUploadDir(options.uploadDir);
  const uploadMarker = `/${normalizedUploadDir}/`;
  if (!url || !url.includes(uploadMarker)) {
    return url;
  }

  try {
    const relativePath = url.split(uploadMarker)[1];
    if (!relativePath) {
      return url;
    }

    const filePath = join(
      process.cwd(),
      ...normalizedUploadDir.split("/"),
      relativePath,
    );
    const data = await readFile(filePath);

    return `data:${inferMimeTypeFromUrl(url)};base64,${data.toString("base64")}`;
  } catch (error) {
    options.logger.warn(options.warnMessage, {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    return url;
  }
}
