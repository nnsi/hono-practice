import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationAdapter } from "./index";
import { createWebNotificationAdapter } from "./index";

describe("NotificationAdapter", () => {
  describe("WebNotificationAdapter", () => {
    let adapter: NotificationAdapter & {
      setToastCallback: (callback: (options: any) => void) => void;
    };
    let originalAlert: typeof window.alert;
    let originalConfirm: typeof window.confirm;

    beforeEach(() => {
      adapter = createWebNotificationAdapter();
      originalAlert = window.alert;
      originalConfirm = window.confirm;
      window.alert = vi.fn();
      window.confirm = vi.fn();
    });

    afterEach(() => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    });

    it("should show toast with callback", () => {
      const toastCallback = vi.fn();
      adapter.setToastCallback(toastCallback);

      adapter.toast({
        title: "Test Title",
        description: "Test Description",
        variant: "default",
      });

      expect(toastCallback).toHaveBeenCalledWith({
        title: "Test Title",
        description: "Test Description",
        variant: "default",
      });
    });

    it("should fallback to console when no toast callback", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      adapter.toast({
        title: "Test Title",
        description: "Test Description",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[Toast] Test Title:",
        "Test Description",
      );

      consoleSpy.mockRestore();
    });

    it("should show alert", async () => {
      await adapter.alert("Alert Title", "Alert Message");
      expect(window.alert).toHaveBeenCalledWith("Alert Message");

      // Test without message
      await adapter.alert("Just Title");
      expect(window.alert).toHaveBeenCalledWith("Just Title");
    });

    it("should show confirm and return result", async () => {
      (window.confirm as any).mockReturnValue(true);
      const result = await adapter.confirm("Confirm Title", "Confirm Message");
      expect(window.confirm).toHaveBeenCalledWith("Confirm Message");
      expect(result).toBe(true);

      // Test cancel
      (window.confirm as any).mockReturnValue(false);
      const cancelResult = await adapter.confirm("Confirm Title");
      expect(window.confirm).toHaveBeenCalledWith("Confirm Title");
      expect(cancelResult).toBe(false);
    });
  });

});
