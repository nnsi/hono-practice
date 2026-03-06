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

describe("reportError (mobile-v2 wrapper)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("sends error report with platform from Platform.OS", () => {
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

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.errorType).toBe("unhandled_error");
    expect(body.message).toBe("Test error");
    expect(body.stack).toBe("at test.ts:1");
    expect(body.platform).toBe("web");
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

  it("handles undefined stack gracefully", () => {
    reportError({
      errorType: "unhandled_error",
      message: "error without stack",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.stack).toBeUndefined();
  });
});
