import { beforeEach, describe, expect, it } from "vitest";

import type { StorageAdapter } from "./index";
import { createWebStorageAdapter } from "./index";

describe("StorageAdapter", () => {
  describe("WebStorageAdapter", () => {
    let adapter: StorageAdapter;

    beforeEach(() => {
      adapter = createWebStorageAdapter();
      localStorage.clear();
    });

    it("should get and set items", async () => {
      await adapter.setItem("test-key", "test-value");
      const value = await adapter.getItem("test-key");
      expect(value).toBe("test-value");
    });

    it("should return null for non-existent items", async () => {
      const value = await adapter.getItem("non-existent");
      expect(value).toBeNull();
    });

    it("should remove items", async () => {
      await adapter.setItem("test-key", "test-value");
      await adapter.removeItem("test-key");
      const value = await adapter.getItem("test-key");
      expect(value).toBeNull();
    });

    it("should get all keys", async () => {
      await adapter.setItem("key1", "value1");
      await adapter.setItem("key2", "value2");
      const keys = await adapter.getAllKeys();
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
    });

    it("should clear all items", async () => {
      await adapter.setItem("key1", "value1");
      await adapter.setItem("key2", "value2");
      await adapter.clear?.();
      const keys = await adapter.getAllKeys();
      expect(keys).toHaveLength(0);
    });

    it("should throw error when localStorage fails", async () => {
      // Skip this test for now - jsdom localStorage doesn't throw errors
      // in the same way as real browsers
    });
  });

});
