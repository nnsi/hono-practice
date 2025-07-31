import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ReactNativeNotificationAdapter,
  WebNotificationAdapter,
} from "./index";

describe("NotificationAdapter", () => {
  describe("WebNotificationAdapter", () => {
    let adapter: WebNotificationAdapter;
    let originalAlert: typeof window.alert;
    let originalConfirm: typeof window.confirm;

    beforeEach(() => {
      adapter = new WebNotificationAdapter();
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

  describe("ReactNativeNotificationAdapter", () => {
    let adapter: ReactNativeNotificationAdapter;
    let mockAlert: any;

    beforeEach(() => {
      mockAlert = {
        alert: vi.fn(),
      };
      adapter = new ReactNativeNotificationAdapter(mockAlert);
    });

    it("should show toast using Alert", () => {
      adapter.toast({
        title: "Toast Title",
        description: "Toast Description",
      });

      expect(mockAlert.alert).toHaveBeenCalledWith(
        "Toast Title",
        "Toast Description",
      );
    });

    it("should show alert and resolve when OK pressed", async () => {
      mockAlert.alert.mockImplementation(
        (_title: string, _message: string, buttons: any[]) => {
          // Call OK button callback
          buttons[0].onPress();
        },
      );

      await adapter.alert("Alert Title", "Alert Message");

      expect(mockAlert.alert).toHaveBeenCalledWith(
        "Alert Title",
        "Alert Message",
        expect.arrayContaining([
          expect.objectContaining({
            text: "OK",
            onPress: expect.any(Function),
          }),
        ]),
      );
    });

    it("should show confirm and return user choice", async () => {
      // Test OK press
      mockAlert.alert.mockImplementation(
        (_title: string, _message: string, buttons: any[]) => {
          // Find and press OK button
          const okButton = buttons.find((b: any) => b.text === "OK");
          okButton.onPress();
        },
      );

      const okResult = await adapter.confirm(
        "Confirm Title",
        "Confirm Message",
      );
      expect(okResult).toBe(true);

      // Test Cancel press
      mockAlert.alert.mockImplementation(
        (_title: string, _message: string, buttons: any[]) => {
          // Find and press Cancel button
          const cancelButton = buttons.find((b: any) => b.text === "Cancel");
          cancelButton.onPress();
        },
      );

      const cancelResult = await adapter.confirm("Confirm Title");
      expect(cancelResult).toBe(false);

      // Verify alert was called with correct buttons
      expect(mockAlert.alert).toHaveBeenCalledWith(
        "Confirm Title",
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            text: "Cancel",
            style: "cancel",
            onPress: expect.any(Function),
          }),
          expect.objectContaining({
            text: "OK",
            onPress: expect.any(Function),
          }),
        ]),
      );
    });
  });
});
