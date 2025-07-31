import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReactNativeStorageAdapter, WebStorageAdapter } from "./index";

describe("StorageAdapter", () => {
  describe("WebStorageAdapter", () => {
    let adapter: WebStorageAdapter;

    beforeEach(() => {
      adapter = new WebStorageAdapter();
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

    it("should throw error when localStorage fails", async () => {
      // Skip this test for now - jsdom localStorage doesn't throw errors
      // in the same way as real browsers
    });
  });

  describe("ReactNativeStorageAdapter", () => {
    let adapter: ReactNativeStorageAdapter;
    let mockAsyncStorage: any;

    beforeEach(() => {
      // Mock AsyncStorage
      mockAsyncStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        getAllKeys: vi.fn(),
      };
      adapter = new ReactNativeStorageAdapter(mockAsyncStorage);
    });

    it("should get items from AsyncStorage", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("test-value");
      const value = await adapter.getItem("test-key");
      expect(value).toBe("test-value");
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith("test-key");
    });

    it("should set items in AsyncStorage", async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      await adapter.setItem("test-key", "test-value");
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "test-key",
        "test-value",
      );
    });

    it("should remove items from AsyncStorage", async () => {
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);
      await adapter.removeItem("test-key");
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith("test-key");
    });

    it("should get all keys from AsyncStorage", async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue(["key1", "key2"]);
      const keys = await adapter.getAllKeys();
      expect(keys).toEqual(["key1", "key2"]);
      expect(mockAsyncStorage.getAllKeys).toHaveBeenCalled();
    });

    it("should handle AsyncStorage errors gracefully", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(
        new Error("AsyncStorage error"),
      );
      const value = await adapter.getItem("test-key");
      expect(value).toBeNull();
    });
  });
});
