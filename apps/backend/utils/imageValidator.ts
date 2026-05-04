import { AppError } from "@backend/error";

// decode後の最大サイズ（4MB）
const MAX_DECODED_BYTES = 4 * 1024 * 1024;
// 画像寸法の最大値（4096px）
const MAX_IMAGE_DIMENSION = 4096;

/**
 * デコード済みバイト列に対してサイズ・magic bytes・寸法を検証する。
 * decode済みバイトはbase64長より小さいので、メモリ消費DoSの最終ガード。
 */
export async function validateImageBytes(
  bytes: Uint8Array,
  mimeType: string,
): Promise<void> {
  if (bytes.byteLength > MAX_DECODED_BYTES) {
    throw new AppError(
      `Image too large. Maximum size is ${MAX_DECODED_BYTES} bytes`,
      400,
    );
  }
  if (!isValidImageMagicBytes(bytes)) {
    throw new AppError("Invalid image file format", 400);
  }
  const dim = readImageDimensions(bytes, mimeType);
  if (
    dim &&
    (dim.width > MAX_IMAGE_DIMENSION || dim.height > MAX_IMAGE_DIMENSION)
  ) {
    throw new AppError(
      `Image dimensions too large. Maximum is ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}`,
      400,
    );
  }
}

function isValidImageMagicBytes(bytes: Uint8Array): boolean {
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true;
  }

  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return true;
  }

  // GIF
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return true;
  }

  // WebP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }

  return false;
}

function readImageDimensions(
  bytes: Uint8Array,
  mimeType: string,
): { width: number; height: number } | null {
  // PNG: IHDR chunk at offset 16-23
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes.byteLength >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  // WebP (VP8 / VP8L / VP8X): 簡易チェック
  // 各サブフォーマットで必要バイト数が異なるため、最小（VP8L=25バイト）で判定し
  // 内側で個別にバイト数を再チェックする
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes.byteLength >= 25 &&
    bytes[12] === 0x56 &&
    bytes[13] === 0x50 &&
    bytes[14] === 0x38
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const fourth = bytes[15];
    // VP8X: width-1 / height-1 little endian 24bit at 24,27 (要 bytes[27..30] = 4バイト)
    if (fourth === 0x58 && bytes.byteLength >= 31) {
      const w = (view.getUint32(24, true) & 0xffffff) + 1;
      const h = (view.getUint32(27, true) & 0xffffff) + 1;
      return { width: w, height: h };
    }
    // VP8L (lossless): 0x4c, header at offset 21
    if (fourth === 0x4c && bytes.byteLength >= 25) {
      const sig = bytes[20];
      if (sig === 0x2f) {
        const b0 = bytes[21];
        const b1 = bytes[22];
        const b2 = bytes[23];
        const b3 = bytes[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height =
          1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height };
      }
    }
    // VP8 (lossy): width/height at offset 26,28 little endian
    if (fourth === 0x20 && bytes.byteLength >= 30) {
      const w = view.getUint16(26, true) & 0x3fff;
      const h = view.getUint16(28, true) & 0x3fff;
      return { width: w, height: h };
    }
  }
  // JPEG: SOF parsing は複雑なのでスキップ（mimeTypeで識別はするが寸法は取らない）
  if (mimeType === "image/jpeg") {
    return null;
  }
  return null;
}

export function generateIconKey(
  userId: string,
  activityId: string,
  isThumb = false,
): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const suffix = isThumb ? "_thumb" : "";
  return `icons/${userId}/${activityId}_${timestamp}_${random}${suffix}.webp`;
}
