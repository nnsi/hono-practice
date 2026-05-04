import { AppError } from "@backend/error";
import { describe, expect, it } from "vitest";

import { generateIconKey, validateImageBytes } from "../imageValidator";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_HEADER_PREFIX = [
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
];

function makePngBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set(PNG_MAGIC);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function makeVp8xBytes(width: number, height: number): Uint8Array {
  // 31バイト: 12バイト RIFF + WEBP + VP8X(0x58) + ヘッダ + width-1/height-1
  const bytes = new Uint8Array(31);
  bytes.set(WEBP_HEADER_PREFIX);
  bytes[12] = 0x56; // V
  bytes[13] = 0x50; // P
  bytes[14] = 0x38; // 8
  bytes[15] = 0x58; // X
  const view = new DataView(bytes.buffer);
  // width-1: 24bit little endian at offset 24
  view.setUint32(24, (width - 1) & 0xffffff, true);
  // height-1: 24bit little endian at offset 27 (要 bytes[27..30])
  view.setUint32(27, (height - 1) & 0xffffff, true);
  return bytes;
}

function makeVp8lBytes(width: number, height: number): Uint8Array {
  // VP8L は 25 バイトあれば寸法読み取り可能
  const bytes = new Uint8Array(25);
  bytes.set(WEBP_HEADER_PREFIX);
  bytes[12] = 0x56;
  bytes[13] = 0x50;
  bytes[14] = 0x38;
  bytes[15] = 0x4c;
  bytes[20] = 0x2f;
  // width-1 / height-1 を 14bit ずつパック
  const wM1 = (width - 1) & 0x3fff;
  const hM1 = (height - 1) & 0x3fff;
  bytes[21] = wM1 & 0xff; // b0 = 下位8bit
  bytes[22] = ((wM1 >> 8) & 0x3f) | ((hM1 & 0x03) << 6); // b1 = width 上位6bit | height 下位2bit
  bytes[23] = (hM1 >> 2) & 0xff; // b2 = height bits 2..9
  bytes[24] = (hM1 >> 10) & 0x0f; // b3 = height bits 10..13
  return bytes;
}

function makeVp8LossyBytes(width: number, height: number): Uint8Array {
  // 30バイト: VP8 lossy。width/height at offset 26,28 (uint16 LE & 0x3fff)
  const bytes = new Uint8Array(30);
  bytes.set(WEBP_HEADER_PREFIX);
  bytes[12] = 0x56;
  bytes[13] = 0x50;
  bytes[14] = 0x38;
  bytes[15] = 0x20;
  const view = new DataView(bytes.buffer);
  view.setUint16(26, width & 0x3fff, true);
  view.setUint16(28, height & 0x3fff, true);
  return bytes;
}

describe("imageValidator", () => {
  describe("validateImageBytes", () => {
    it("有効なPNG（許容寸法内）を受け入れる", async () => {
      const bytes = makePngBytes(100, 100);
      await expect(
        validateImageBytes(bytes, "image/png"),
      ).resolves.toBeUndefined();
    });

    it("有効なJPEGを受け入れる（寸法チェックは省略）", async () => {
      const bytes = new Uint8Array(24);
      bytes.set([0xff, 0xd8, 0xff, 0xe0]);
      await expect(
        validateImageBytes(bytes, "image/jpeg"),
      ).resolves.toBeUndefined();
    });

    it("有効なWebP(VP8X)を受け入れる", async () => {
      const bytes = makeVp8xBytes(200, 200);
      await expect(
        validateImageBytes(bytes, "image/webp"),
      ).resolves.toBeUndefined();
    });

    it("最大サイズを超えるバイト列を拒否する", async () => {
      const bytes = new Uint8Array(4 * 1024 * 1024 + 1);
      bytes.set(PNG_MAGIC);
      await expect(validateImageBytes(bytes, "image/png")).rejects.toThrow(
        AppError,
      );
      await expect(validateImageBytes(bytes, "image/png")).rejects.toThrow(
        /too large/,
      );
    });

    it("magic bytes不正を拒否する", async () => {
      const bytes = new Uint8Array(24);
      // 全部0で magic 不正
      await expect(validateImageBytes(bytes, "image/png")).rejects.toThrow(
        AppError,
      );
      await expect(validateImageBytes(bytes, "image/png")).rejects.toThrow(
        /Invalid image file format/,
      );
    });

    it("PNG寸法超過(width)を拒否する", async () => {
      const bytes = makePngBytes(4097, 100);
      await expect(validateImageBytes(bytes, "image/png")).rejects.toThrow(
        /dimensions too large/,
      );
    });

    it("PNG寸法超過(height)を拒否する", async () => {
      const bytes = makePngBytes(100, 4097);
      await expect(validateImageBytes(bytes, "image/png")).rejects.toThrow(
        /dimensions too large/,
      );
    });

    it("WebP(VP8X)寸法超過を拒否する", async () => {
      const bytes = makeVp8xBytes(5000, 100);
      await expect(validateImageBytes(bytes, "image/webp")).rejects.toThrow(
        /dimensions too large/,
      );
    });

    it("有効なWebP(VP8L lossless)を受け入れる", async () => {
      const bytes = makeVp8lBytes(100, 100);
      await expect(
        validateImageBytes(bytes, "image/webp"),
      ).resolves.toBeUndefined();
    });

    it("WebP(VP8L lossless)寸法超過(width)を拒否する", async () => {
      // 14bit 上限(16383)以下で 4097 を指定
      const bytes = makeVp8lBytes(4097, 100);
      await expect(validateImageBytes(bytes, "image/webp")).rejects.toThrow(
        /dimensions too large/,
      );
    });

    it("WebP(VP8L lossless)寸法超過(height)を拒否する", async () => {
      const bytes = makeVp8lBytes(100, 4097);
      await expect(validateImageBytes(bytes, "image/webp")).rejects.toThrow(
        /dimensions too large/,
      );
    });

    it("WebP(VP8L)シグネチャ(0x2f)不一致は寸法スキップで通過", async () => {
      const bytes = makeVp8lBytes(100, 100);
      bytes[20] = 0x00;
      await expect(
        validateImageBytes(bytes, "image/webp"),
      ).resolves.toBeUndefined();
    });

    it("有効なWebP(VP8 lossy)を受け入れる", async () => {
      const bytes = makeVp8LossyBytes(100, 100);
      await expect(
        validateImageBytes(bytes, "image/webp"),
      ).resolves.toBeUndefined();
    });

    it("WebP(VP8 lossy)寸法超過(width)を拒否する", async () => {
      const bytes = makeVp8LossyBytes(4097, 100);
      await expect(validateImageBytes(bytes, "image/webp")).rejects.toThrow(
        /dimensions too large/,
      );
    });

    it("WebP(VP8 lossy)寸法超過(height)を拒否する", async () => {
      const bytes = makeVp8LossyBytes(100, 4097);
      await expect(validateImageBytes(bytes, "image/webp")).rejects.toThrow(
        /dimensions too large/,
      );
    });

    it("VP8X 30バイト境界 (>= 31必須) では寸法読まずに通過させる", async () => {
      // 30バイトのみ。VP8X 寸法読み取りは31バイト要するので、寸法スキップで通過
      const bytes = new Uint8Array(30);
      bytes.set(WEBP_HEADER_PREFIX);
      bytes[12] = 0x56;
      bytes[13] = 0x50;
      bytes[14] = 0x38;
      bytes[15] = 0x58;
      // RangeError を投げず、寸法は null (スキップ) で resolve すること
      await expect(
        validateImageBytes(bytes, "image/webp"),
      ).resolves.toBeUndefined();
    });
  });

  describe("generateIconKey", () => {
    it("メインアイコンのキーを生成する", () => {
      const userId = "user123";
      const activityId = "activity456";
      const key = generateIconKey(userId, activityId);
      expect(key).toMatch(/^icons\/user123\/activity456_\d+_[a-f0-9]+\.webp$/);
    });

    it("サムネイルアイコンのキーを生成する", () => {
      const userId = "user123";
      const activityId = "activity456";
      const key = generateIconKey(userId, activityId, true);
      expect(key).toMatch(
        /^icons\/user123\/activity456_\d+_[a-f0-9]+_thumb\.webp$/,
      );
    });

    it("連続呼び出しで異なるキーを生成する", () => {
      const userId = "user123";
      const activityId = "activity456";
      const key1 = generateIconKey(userId, activityId);
      const key2 = generateIconKey(userId, activityId);
      expect(key1).not.toBe(key2);
    });
  });
});
