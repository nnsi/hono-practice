import { beforeEach, describe, expect, it, vi } from "vitest";

import { createWebEventBusAdapter } from "./index";

import type { EventBusAdapter } from "./index";

describe("EventBusAdapter", () => {
  describe("WebEventBusAdapter", () => {
    let adapter: EventBusAdapter;

    beforeEach(() => {
      adapter = createWebEventBusAdapter();
    });

    it("should emit and receive events", () => {
      const handler = vi.fn();
      adapter.on("test-event", handler);

      adapter.emit("test-event", { data: "test" });
      expect(handler).toHaveBeenCalledWith({ data: "test" });

      // Emit without data
      adapter.emit("test-event");
      expect(handler).toHaveBeenCalledWith(undefined);
    });

    it("should handle multiple listeners for same event", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      adapter.on("test-event", handler1);
      adapter.on("test-event", handler2);

      adapter.emit("test-event", "data");

      expect(handler1).toHaveBeenCalledWith("data");
      expect(handler2).toHaveBeenCalledWith("data");
    });

    it("should not call handler for different events", () => {
      const handler = vi.fn();
      adapter.on("event1", handler);

      adapter.emit("event2", "data");
      expect(handler).not.toHaveBeenCalled();
    });

    it("should unsubscribe using returned function", () => {
      const handler = vi.fn();
      const unsubscribe = adapter.on("test-event", handler);

      adapter.emit("test-event", "data1");
      expect(handler).toHaveBeenCalledWith("data1");

      handler.mockClear();
      unsubscribe();

      adapter.emit("test-event", "data2");
      expect(handler).not.toHaveBeenCalled();
    });

    it("should unsubscribe using off method", () => {
      const handler = vi.fn();
      adapter.on("test-event", handler);

      adapter.emit("test-event", "data1");
      expect(handler).toHaveBeenCalledWith("data1");

      handler.mockClear();
      adapter.off("test-event", handler);

      adapter.emit("test-event", "data2");
      expect(handler).not.toHaveBeenCalled();
    });

    it("should handle off for non-existent event", () => {
      const handler = vi.fn();
      // Should not throw
      expect(() => adapter.off("non-existent", handler)).not.toThrow();
    });

    it("should clean up empty event maps", () => {
      const handler = vi.fn();
      adapter.on("test-event", handler);
      adapter.off("test-event", handler);

      // Should not have any listeners
      adapter.emit("test-event", "data");
      expect(handler).not.toHaveBeenCalled();
    });

    it("should handle multiple handlers and partial removal", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      adapter.on("test-event", handler1);
      adapter.on("test-event", handler2);
      adapter.on("test-event", handler3);

      // Remove only handler2
      adapter.off("test-event", handler2);

      adapter.emit("test-event", "data");

      expect(handler1).toHaveBeenCalledWith("data");
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).toHaveBeenCalledWith("data");
    });
  });
});
