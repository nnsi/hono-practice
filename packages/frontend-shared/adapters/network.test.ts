import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createReactNativeNetworkAdapter,
  createWebNetworkAdapter,
} from "./index";

import type { NetworkAdapter } from "./index";

describe("NetworkAdapter", () => {
  describe("WebNetworkAdapter", () => {
    let adapter: NetworkAdapter;
    let originalNavigatorOnLine: boolean;

    beforeEach(() => {
      adapter = createWebNetworkAdapter();
      originalNavigatorOnLine = navigator.onLine;
    });

    afterEach(() => {
      // Restore original value
      Object.defineProperty(navigator, "onLine", {
        value: originalNavigatorOnLine,
        writable: true,
        configurable: true,
      });
    });

    it("should return current online status", () => {
      Object.defineProperty(navigator, "onLine", {
        value: true,
        writable: true,
        configurable: true,
      });
      expect(adapter.isOnline()).toBe(true);

      Object.defineProperty(navigator, "onLine", {
        value: false,
        writable: true,
        configurable: true,
      });
      expect(adapter.isOnline()).toBe(false);
    });

    it("should add and remove listeners", () => {
      const callback = vi.fn();
      const unsubscribe = adapter.addListener(callback);

      // Simulate online event
      window.dispatchEvent(new Event("online"));
      expect(callback).toHaveBeenCalledWith(true);

      // Simulate offline event
      window.dispatchEvent(new Event("offline"));
      expect(callback).toHaveBeenCalledWith(false);

      // Unsubscribe
      unsubscribe();
      callback.mockClear();

      // Should not receive events after unsubscribe
      window.dispatchEvent(new Event("online"));
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("ReactNativeNetworkAdapter", () => {
    let adapter: NetworkAdapter;
    let mockNetInfo: any;
    let mockUnsubscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockUnsubscribe = vi.fn();
      mockNetInfo = {
        addEventListener: vi.fn().mockReturnValue(mockUnsubscribe),
        fetch: vi.fn().mockResolvedValue({ isConnected: true }),
      };
      adapter = createReactNativeNetworkAdapter(mockNetInfo);
    });

    it("should initialize with online status", () => {
      // Default should be true
      expect(adapter.isOnline()).toBe(true);
    });

    it("should update status when connection changes", async () => {
      const callback = vi.fn();
      const unsubscribe = adapter.addListener(callback);

      // Wait for initial fetch
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Initial state
      expect(callback).toHaveBeenCalledWith(true);

      // Get the listener that was registered
      const listener = mockNetInfo.addEventListener.mock.calls[0][0];

      // Simulate connection change
      listener({ isConnected: false });
      expect(adapter.isOnline()).toBe(false);
      expect(callback).toHaveBeenCalledWith(false);

      // Simulate connection restored
      listener({ isConnected: true });
      expect(adapter.isOnline()).toBe(true);
      expect(callback).toHaveBeenCalledWith(true);

      // Unsubscribe
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it("should handle null connection state", async () => {
      mockNetInfo.fetch.mockResolvedValue({ isConnected: null });
      const callback = vi.fn();
      adapter.addListener(callback);

      // Wait for initial fetch
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should treat null as true (connected)
      expect(callback).toHaveBeenCalledWith(true);
    });
  });
});
