import { existsSync } from "node:fs";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { newLocalStorageService } from "../localStorageService";

describe("localStorageService", () => {
  const testDir = "test-uploads";
  const baseUrl = "http://localhost:3000";
  let storage: ReturnType<typeof newLocalStorageService>;

  beforeEach(async () => {
    storage = newLocalStorageService(baseUrl, testDir);
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe("upload", () => {
    it("ファイルをアップロードできる", async () => {
      const content = "test content";
      const file = new File([content], "test.txt", { type: "text/plain" });
      const key = "test/file.txt";

      const result = await storage.upload(file, key);

      // 開発環境ではdata URLが返される
      expect(result.url).toMatch(/^data:text\/plain;base64,/);
      expect(result.url).toBe(
        `data:text/plain;base64,${Buffer.from(content).toString("base64")}`,
      );
      expect(result.key).toBe(key);
      expect(result.size).toBe(content.length);
      expect(result.contentType).toBe("text/plain");

      // ファイルが実際に保存されているか確認
      const savedContent = await readFile(join(testDir, key), "utf-8");
      expect(savedContent).toBe(content);
    });

    it("ディレクトリが存在しない場合は作成される", async () => {
      expect(existsSync(testDir)).toBe(false);

      const file = new File(["test"], "test.txt", { type: "text/plain" });
      await storage.upload(file, "test.txt");

      expect(existsSync(testDir)).toBe(true);
    });

    it("カスタムcontentTypeを指定できる", async () => {
      const file = new File(["test"], "test.txt", { type: "text/plain" });
      const key = "test.txt";

      const result = await storage.upload(file, key, {
        contentType: "application/custom",
      });

      expect(result.contentType).toBe("application/custom");
    });
  });

  describe("delete", () => {
    it("ファイルを削除できる", async () => {
      const file = new File(["test"], "test.txt", { type: "text/plain" });
      const key = "test.txt";

      await storage.upload(file, key);
      expect(existsSync(join(testDir, key))).toBe(true);

      await storage.delete(key);
      expect(existsSync(join(testDir, key))).toBe(false);
    });

    it("存在しないファイルを削除してもエラーにならない", async () => {
      await expect(storage.delete("non-existent.txt")).resolves.toBeUndefined();
    });

    it("uploads 配下の symlink 経由でも外のファイルを削除しない", async () => {
      const outside = join(testDir, "..", "test-uploads-symlink-target.txt");
      await writeFile(outside, "marker");
      await mkdir(testDir, { recursive: true });
      await symlink(resolve(outside), join(testDir, "link.txt"));
      try {
        await storage.delete("link.txt");
        expect(existsSync(outside)).toBe(true);
        expect(await storage.exists("link.txt")).toBe(false);
      } finally {
        await rm(outside, { force: true });
      }
    });

    it("`..` で uploads ディレクトリ外のファイルを削除しない", async () => {
      const outside = join(testDir, "..", "test-uploads-outside.txt");
      await writeFile(outside, "marker");
      try {
        await expect(
          storage.delete("../test-uploads-outside.txt"),
        ).rejects.toThrow("storage key escapes upload directory");
        expect(existsSync(outside)).toBe(true);
      } finally {
        await rm(outside, { force: true });
      }
    });
  });

  describe("getUrl", () => {
    it("正しいURLを返す", () => {
      const key = "path/to/file.jpg";
      const url = storage.getUrl(key);

      expect(url).toBe(`${baseUrl}/${testDir}/${key}`);
    });
  });

  describe("exists", () => {
    it("ファイルが存在する場合はtrueを返す", async () => {
      const file = new File(["test"], "test.txt", { type: "text/plain" });
      const key = "test.txt";

      await storage.upload(file, key);
      const exists = await storage.exists(key);

      expect(exists).toBe(true);
    });

    it("ファイルが存在しない場合はfalseを返す", async () => {
      const exists = await storage.exists("non-existent.txt");

      expect(exists).toBe(false);
    });

    it("`..` で uploads ディレクトリ外を問い合わせても false を返す", async () => {
      expect(await storage.exists("../package.json")).toBe(false);
    });
  });
});
