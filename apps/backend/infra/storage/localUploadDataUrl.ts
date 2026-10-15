import { readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";

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

// iconUrl は同期 API 経由でクライアントが自由に書けるため、`..` を含む
// 相対パスで uploads ディレクトリ外のファイルを読まないよう包含検査する。
export function isPathInsideDir(baseDir: string, filePath: string): boolean {
  const base = resolve(baseDir);
  const target = resolve(filePath);
  return target === base || target.startsWith(base + sep);
}

// 字句上の包含検査は symlink を辿らないため、実体のパスでも uploads 配下か確認する。
// 対象が存在しない場合は false を返し、呼び出し側で「読まない / 消さない」扱いにする。
export async function isRealPathInsideDir(
  baseDir: string,
  filePath: string,
): Promise<boolean> {
  try {
    const [realBase, realTarget] = await Promise.all([
      realpath(baseDir),
      realpath(filePath),
    ]);
    return realTarget === realBase || realTarget.startsWith(realBase + sep);
  } catch {
    return false;
  }
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
  if (!url?.includes(uploadMarker)) {
    return url;
  }

  try {
    const relativePath = url.split(uploadMarker)[1];
    if (!relativePath) {
      return url;
    }

    const baseDir = resolve(process.cwd(), ...normalizedUploadDir.split("/"));
    const filePath = resolve(baseDir, relativePath);
    if (
      !isPathInsideDir(baseDir, filePath) ||
      !(await isRealPathInsideDir(baseDir, filePath))
    ) {
      options.logger.warn(options.warnMessage, {
        url,
        error: "path escapes upload directory",
      });
      return url;
    }
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
