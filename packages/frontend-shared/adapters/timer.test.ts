import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createReactNativeTimerAdapter, createWebTimerAdapter } from "./index";

import type { TimerAdapter } from "./index";

describe("TimerAdapter", () => {
  describe("WebTimerAdapter", () => {
    let adapter: TimerAdapter<number>;

    beforeEach(() => {
      adapter = createWebTimerAdapter();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should set and clear intervals", () => {
      const callback = vi.fn();
      const id = adapter.setInterval(callback, 100);

      expect(callback).not.toHaveBeenCalled();

      // Advance time by 100ms
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);

      // Advance time by another 100ms
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(2);

      // Clear interval
      adapter.clearInterval(id);

      // Advance time and verify no more calls
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple intervals", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const id1 = adapter.setInterval(callback1, 100);
      const id2 = adapter.setInterval(callback2, 200);

      // Advance by 100ms - only callback1 should be called
      vi.advanceTimersByTime(100);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);

      // Advance by another 100ms - both should be called
      vi.advanceTimersByTime(100);
      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(1);

      adapter.clearInterval(id1);
      adapter.clearInterval(id2);
    });
  });

  describe("ReactNativeTimerAdapter", () => {
    let adapter: TimerAdapter<number>;

    beforeEach(() => {
      adapter = createReactNativeTimerAdapter();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should set and clear intervals using Node timers", () => {
      const callback = vi.fn();
      const id = adapter.setInterval(callback, 100);

      expect(callback).not.toHaveBeenCalled();

      // Advance time by 100ms
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);

      // Advance time by another 100ms
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(2);

      // Clear interval
      adapter.clearInterval(id);

      // Advance time and verify no more calls
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should return NodeJS.Timeout type", () => {
      const callback = vi.fn();
      const id = adapter.setInterval(callback, 100);

      // In test environment, this will be a number, but the type system
      // should treat it as NodeJS.Timeout
      expect(typeof id).toBe("object");
      adapter.clearInterval(id);
    });
  });
});
