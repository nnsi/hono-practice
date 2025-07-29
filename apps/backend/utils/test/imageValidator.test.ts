import { AppError } from "@backend/error";
import { describe, expect, it } from "vitest";


import { generateIconKey, validateImage } from "../imageValidator";

describe("imageValidator", () => {
  describe("validateImage", () => {
    it("JPEGファイルを受け入れる", async () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const file = new File([jpegBytes], "test.jpg", { type: "image/jpeg" });

      await expect(validateImage(file)).resolves.toBeUndefined();
    });

    it("PNGファイルを受け入れる", async () => {
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const file = new File([pngBytes], "test.png", { type: "image/png" });

      await expect(validateImage(file)).resolves.toBeUndefined();
    });

    it("GIFファイルを受け入れる", async () => {
      const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      const file = new File([gifBytes], "test.gif", { type: "image/gif" });

      await expect(validateImage(file)).resolves.toBeUndefined();
    });

    it("WebPファイルを受け入れる", async () => {
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      const file = new File([webpBytes], "test.webp", { type: "image/webp" });

      await expect(validateImage(file)).resolves.toBeUndefined();
    });

    it("サポートされていないファイルタイプを拒否する", async () => {
      const file = new File(["test"], "test.txt", { type: "text/plain" });

      await expect(validateImage(file)).rejects.toThrow(AppError);
      await expect(validateImage(file)).rejects.toThrow("Invalid file type");
    });

    it("サポートされていない拡張子を拒否する", async () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const file = new File([jpegBytes], "test.txt", { type: "image/jpeg" });

      await expect(validateImage(file)).rejects.toThrow(AppError);
      await expect(validateImage(file)).rejects.toThrow(
        "Invalid file extension",
      );
    });

    it("無効なマジックバイトを拒否する", async () => {
      const invalidBytes = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const file = new File([invalidBytes], "test.jpg", { type: "image/jpeg" });

      await expect(validateImage(file)).rejects.toThrow(AppError);
      await expect(validateImage(file)).rejects.toThrow(
        "Invalid image file format",
      );
    });
  });

  describe("generateIconKey", () => {
    it("メインアイコンのキーを生成する", () => {
      const userId = "user123";
      const activityId = "activity456";

      const key = generateIconKey(userId, activityId);

      expect(key).toMatch(/^icons\/user123\/activity456_\d+_[a-z0-9]+\.webp$/);
    });

    it("サムネイルアイコンのキーを生成する", () => {
      const userId = "user123";
      const activityId = "activity456";

      const key = generateIconKey(userId, activityId, true);

      expect(key).toMatch(
        /^icons\/user123\/activity456_\d+_[a-z0-9]+_thumb\.webp$/,
      );
    });

    it("異なるタイムスタンプで異なるキーを生成する", () => {
      const userId = "user123";
      const activityId = "activity456";

      const key1 = generateIconKey(userId, activityId);
      const key2 = generateIconKey(userId, activityId);

      expect(key1).not.toBe(key2);
    });
  });
});
