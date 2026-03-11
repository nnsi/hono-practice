import { beforeEach, describe, expect, it, vi } from "vitest";

import { reportError } from "./errorReporter";

const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

describe("reportError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("sends error report via fetch", () => {
    reportError(
      {
        errorType: "unhandled_error",
        message: "Test error",
        stack: "at test.ts:1",
      },
      { apiUrl: "http://localhost:3456", platform: "web" },
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3456/client-errors",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.errorType).toBe("unhandled_error");
    expect(body.message).toBe("Test error");
    expect(body.stack).toBe("at test.ts:1");
    expect(body.platform).toBe("web");
  });

  it("sends correct platform for mobile", () => {
    reportError(
      { errorType: "component_error", message: "error" },
      { apiUrl: "http://localhost:3456", platform: "ios" },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.platform).toBe("ios");
  });

  it("truncates message to 1000 characters", () => {
    const longMessage = "x".repeat(2000);
    reportError(
      { errorType: "component_error", message: longMessage },
      { apiUrl: "http://localhost:3456", platform: "web" },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.message.length).toBe(1000);
  });

  it("truncates stack to 5000 characters", () => {
    const longStack = "x".repeat(10000);
    reportError(
      { errorType: "component_error", message: "error", stack: longStack },
      { apiUrl: "http://localhost:3456", platform: "web" },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.stack.length).toBe(5000);
  });

  it("does not throw when fetch rejects", () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    expect(() => {
      reportError(
        { errorType: "network_error", message: "test" },
        { apiUrl: "http://localhost:3456", platform: "web" },
      );
    }).not.toThrow();
  });

  it("does not throw when fetch throws synchronously", () => {
    mockFetch.mockImplementation(() => {
      throw new Error("Sync error");
    });

    expect(() => {
      reportError(
        { errorType: "network_error", message: "test" },
        { apiUrl: "http://localhost:3456", platform: "web" },
      );
    }).not.toThrow();
  });

  it("handles undefined stack gracefully", () => {
    reportError(
      { errorType: "unhandled_error", message: "error without stack" },
      { apiUrl: "http://localhost:3456", platform: "web" },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.stack).toBeUndefined();
  });

  it("includes context from getContext", () => {
    reportError(
      { errorType: "unhandled_error", message: "error" },
      {
        apiUrl: "http://localhost:3456",
        platform: "web",
        getContext: () => ({ userId: "user-123", screen: "/daily" }),
      },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.userId).toBe("user-123");
    expect(body.screen).toBe("/daily");
  });

  it("works without getContext", () => {
    reportError(
      { errorType: "unhandled_error", message: "error" },
      { apiUrl: "http://localhost:3456", platform: "web" },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.userId).toBeUndefined();
    expect(body.screen).toBeUndefined();
  });

  it("still sends report when getContext throws", () => {
    reportError(
      { errorType: "unhandled_error", message: "important error" },
      {
        apiUrl: "http://localhost:3456",
        platform: "web",
        getContext: () => {
          throw new Error("getContext failed");
        },
      },
    );

    expect(mockFetch).toHaveBeenCalled();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.errorType).toBe("unhandled_error");
    expect(body.message).toBe("important error");
    expect(body.userId).toBeUndefined();
    expect(body.screen).toBeUndefined();
  });

  it("getContext does not override errorType or message", () => {
    reportError(
      { errorType: "component_error", message: "original" },
      {
        apiUrl: "http://localhost:3456",
        platform: "web",
        getContext: () =>
          ({
            userId: "user-1",
            errorType: "hacked",
            message: "overwritten",
          }) as never,
      },
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.errorType).toBe("component_error");
    expect(body.message).toBe("original");
    expect(body.userId).toBe("user-1");
  });
});
