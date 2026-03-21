import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  setupGlobalErrorHandler,
  shouldIgnoreError,
} from "./globalErrorHandler";

describe("shouldIgnoreError", () => {
  it("filters Google Identity Services errors", () => {
    expect(shouldIgnoreError("Failed to load Google Identity Services")).toBe(
      true,
    );
  });

  it("filters GIS errors regardless of surrounding text", () => {
    expect(
      shouldIgnoreError(
        "Script error: Google Identity Services could not load",
      ),
    ).toBe(true);
  });

  it("filters SW Rejected errors with registerSW in stack", () => {
    expect(
      shouldIgnoreError(
        "Rejected",
        "Error: Rejected\n    at registerSW.js:10:5",
      ),
    ).toBe(true);
  });

  it("does not filter Rejected without registerSW in stack", () => {
    expect(
      shouldIgnoreError(
        "Rejected",
        "Error: Rejected\n    at someOtherFile.js:10:5",
      ),
    ).toBe(false);
  });

  it("does not filter Rejected without stack", () => {
    expect(shouldIgnoreError("Rejected")).toBe(false);
  });

  it("does not filter normal errors", () => {
    expect(shouldIgnoreError("TypeError: Cannot read property")).toBe(false);
  });

  it("does not filter errors with registerSW in stack but different message", () => {
    expect(
      shouldIgnoreError(
        "NetworkError",
        "Error: NetworkError\n    at registerSW.js:10:5",
      ),
    ).toBe(false);
  });
});

describe("setupGlobalErrorHandler", () => {
  let listeners: Record<string, EventListener>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listeners = {};
    onError = vi.fn();

    vi.stubGlobal("window", {
      addEventListener: (type: string, handler: EventListener) => {
        listeners[type] = handler;
      },
    });

    setupGlobalErrorHandler(onError);
  });

  it("calls onError for normal error events", () => {
    listeners.error({
      message: "Something broke",
      error: { stack: "at app.js:1" },
    } as unknown as Event);

    expect(onError).toHaveBeenCalledWith({
      errorType: "unhandled_error",
      message: "Something broke",
      stack: "at app.js:1",
    });
  });

  it("does not call onError for GIS error events", () => {
    listeners.error({
      message: "Failed to load Google Identity Services",
      error: { stack: "at gis.js:1" },
    } as unknown as Event);

    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onError for normal unhandledrejection events", () => {
    const error = new Error("async failure");
    listeners.unhandledrejection({
      reason: error,
    } as unknown as Event);

    expect(onError).toHaveBeenCalledWith({
      errorType: "unhandled_error",
      message: "async failure",
      stack: error.stack,
    });
  });

  it("does not call onError for SW Rejected rejections", () => {
    const error = new Error("Rejected");
    error.stack = "Error: Rejected\n    at registerSW.js:10:5";
    listeners.unhandledrejection({
      reason: error,
    } as unknown as Event);

    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onError for Rejected without registerSW stack", () => {
    const error = new Error("Rejected");
    error.stack = "Error: Rejected\n    at main.js:5:3";
    listeners.unhandledrejection({
      reason: error,
    } as unknown as Event);

    expect(onError).toHaveBeenCalledWith({
      errorType: "unhandled_error",
      message: "Rejected",
      stack: error.stack,
    });
  });
});
