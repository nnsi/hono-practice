import { AppError } from "@backend/error";
import sharp from "sharp";
import { describe, expect, it } from "vitest";


import { generateThumbnail, getImageMetadata } from "../imageThumbnail";

describe("imageThumbnail", () => {
  describe("generateThumbnail", () => {
    it("1000x1000の画像を512x512にリサイズする", async () => {
      // Create a test image
      const testImage = await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const thumbnail = await generateThumbnail(
        testImage.buffer as ArrayBuffer,
      );
      const metadata = await sharp(thumbnail).metadata();

      expect(metadata.width).toBe(512);
      expect(metadata.height).toBe(512);
      expect(metadata.format).toBe("webp");
    });

    it("300x300の画像は拡大しない", async () => {
      const testImage = await sharp({
        create: {
          width: 300,
          height: 300,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const thumbnail = await generateThumbnail(
        testImage.buffer as ArrayBuffer,
      );
      const metadata = await sharp(thumbnail).metadata();

      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
    });

    it("カスタムサイズを指定できる", async () => {
      const testImage = await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 3,
          background: { r: 0, g: 0, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      const thumbnail = await generateThumbnail(
        testImage.buffer as ArrayBuffer,
        { size: 256 },
      );
      const metadata = await sharp(thumbnail).metadata();

      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
    });

    it("フォーマットをJPEGに指定できる", async () => {
      const testImage = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
        },
      })
        .png()
        .toBuffer();

      const thumbnail = await generateThumbnail(
        testImage.buffer as ArrayBuffer,
        { format: "jpeg" },
      );
      const metadata = await sharp(thumbnail).metadata();

      expect(metadata.format).toBe("jpeg");
    });

    it("フォーマットをPNGに指定できる", async () => {
      const testImage = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
        },
      })
        .jpeg()
        .toBuffer();

      const thumbnail = await generateThumbnail(
        testImage.buffer as ArrayBuffer,
        { format: "png" },
      );
      const metadata = await sharp(thumbnail).metadata();

      expect(metadata.format).toBe("png");
    });

    it("縦長の画像をアスペクト比を保持してリサイズする", async () => {
      const testImage = await sharp({
        create: {
          width: 500,
          height: 1000,
          channels: 3,
          background: { r: 255, g: 255, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const thumbnail = await generateThumbnail(
        testImage.buffer as ArrayBuffer,
      );
      const metadata = await sharp(thumbnail).metadata();

      expect(metadata.width).toBe(256); // 500/1000 * 512
      expect(metadata.height).toBe(512);
    });

    it("横長の画像をアスペクト比を保持してリサイズする", async () => {
      const testImage = await sharp({
        create: {
          width: 1000,
          height: 500,
          channels: 3,
          background: { r: 255, g: 0, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      const thumbnail = await generateThumbnail(
        testImage.buffer as ArrayBuffer,
      );
      const metadata = await sharp(thumbnail).metadata();

      expect(metadata.width).toBe(512);
      expect(metadata.height).toBe(256); // 500/1000 * 512
    });

    it("無効な画像データでエラーを返す", async () => {
      const invalidData = new ArrayBuffer(100);

      await expect(generateThumbnail(invalidData)).rejects.toThrow(AppError);
      await expect(generateThumbnail(invalidData)).rejects.toThrow(
        "Failed to generate thumbnail",
      );
    });
  });

  describe("getImageMetadata", () => {
    it("画像のメタデータを取得できる", async () => {
      const testImage = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 0, g: 128, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      const metadata = await getImageMetadata(testImage.buffer as ArrayBuffer);

      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
      expect(metadata.format).toBe("jpeg");
      expect(metadata.size).toBeGreaterThan(0);
    });

    it("無効なデータでエラーを返す", async () => {
      const invalidData = new ArrayBuffer(50);

      await expect(getImageMetadata(invalidData)).rejects.toThrow(AppError);
      await expect(getImageMetadata(invalidData)).rejects.toThrow(
        "Failed to get image metadata",
      );
    });
  });
});
