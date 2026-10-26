import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { R2Bucket } from "@cloudflare/workers-types";
import { createUserId } from "@packages/domain/user/userSchema";
import { describe, expect, it, vi } from "vitest";

import { newUserFileDeletion } from "./userFileDeletion";

const userId = createUserId();
describe("user file deletion", () => {
  it("removes all R2 pages in the exact user namespace, including orphan files", async () => {
    const keys = new Set(
      Array.from({ length: 1002 }, (_, i) => `icons/${userId}/old-${i}.webp`),
    );
    keys.add(`icons/${userId}-other/keep.webp`);
    const list = vi.fn(async ({ prefix, limit }) => ({
      objects: [...keys]
        .filter((k) => k.startsWith(prefix))
        .slice(0, limit)
        .map((key) => ({ key })),
    }));
    const remove = vi.fn(async (batch: string[]) => {
      for (const key of batch) keys.delete(key);
    });
    const bucket = { list, delete: remove } as unknown as R2Bucket;
    await newUserFileDeletion({
      STORAGE_TYPE: "r2",
      R2_BUCKET: bucket,
      UPLOAD_DIR: "unused",
    })(userId);
    expect([...keys]).toEqual([`icons/${userId}-other/keep.webp`]);
    expect(remove.mock.calls.map(([batch]) => batch.length)).toEqual([1000, 2]);
  });

  it("propagates R2 errors so account deletion can retry", async () => {
    const bucket = {
      list: vi.fn().mockRejectedValue(new Error("unavailable")),
    } as unknown as R2Bucket;
    await expect(
      newUserFileDeletion({
        STORAGE_TYPE: "r2",
        R2_BUCKET: bucket,
        UPLOAD_DIR: "unused",
      })(userId),
    ).rejects.toThrow("unavailable");
  });

  it("deletes local orphan files and rejects a symlink to another user's files", async () => {
    const root = await mkdtemp(join(tmpdir(), "actiko-delete-"));
    const owned = join(root, "icons", userId);
    const other = join(root, "icons", createUserId());
    try {
      await mkdir(owned, { recursive: true });
      await mkdir(other, { recursive: true });
      await writeFile(join(owned, "orphan.webp"), "private");
      await writeFile(join(other, "keep.webp"), "keep");
      const remove = newUserFileDeletion({
        STORAGE_TYPE: "local",
        UPLOAD_DIR: root,
      });
      await remove(userId);
      await expect(access(owned)).rejects.toThrow();
      await remove(userId);
      await symlink(other, owned);
      await expect(remove(userId)).rejects.toThrow("Unsafe");
      expect(await readFile(join(other, "keep.webp"), "utf8")).toBe("keep");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
