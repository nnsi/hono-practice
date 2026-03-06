import { reportError } from "./errorReporter";

// Mock react-native
vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

// Mock apiClient
vi.mock("./apiClient", () => ({
  getApiUrl: vi.fn(() => "http://localhost:3456"),
}));

// Mock global fetch
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

describe("reportError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("sends error report via fetch", () => {
    reportError({
      errorType: "unhandled_error",
      message: "Test error",
      stack: "at test.ts:1",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3456/client-errors",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    // Verify body contains required fields
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.errorType).toBe("unhandled_error");
    expect(body.message).toBe("Test error");
    expect(body.stack).toBe("at test.ts:1");
    expect(body.platform).toBe("web");
  });

  it("truncates message to 1000 characters", () => {
    const longMessage = "x".repeat(2000);
    reportError({
      errorType: "component_error",
      message: longMessage,
      platform: "web" as any, // will be overridden by Platform.OS
    } as any);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.message.length).toBe(1000);
  });

  it("truncates stack to 5000 characters", () => {
    const longStack = "x".repeat(10000);
    reportError({
      errorType: "component_error",
      message: "error",
      stack: longStack,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.stack.length).toBe(5000);
  });

  it("does not throw when fetch fails", () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    expect(() => {
      reportError({
        errorType: "network_error",
        message: "test",
      });
    }).not.toThrow();
  });

  it("does not throw when fetch itself throws synchronously", () => {
    mockFetch.mockImplementation(() => {
      throw new Error("Sync error");
    });

    expect(() => {
      reportError({
        errorType: "network_error",
        message: "test",
      });
    }).not.toThrow();
  });

  it("handles undefined stack gracefully", () => {
    reportError({
      errorType: "unhandled_error",
      message: "error without stack",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.stack).toBeUndefined();
  });
});
