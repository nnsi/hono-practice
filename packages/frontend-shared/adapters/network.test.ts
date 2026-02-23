import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NetworkAdapter } from "./index";
import { createWebNetworkAdapter } from "./index";

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

});
