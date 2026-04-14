import { describe, expect, it } from "vitest";

import { resolveNativeApiUrl } from "./apiUrlResolver";

describe("resolveNativeApiUrl", () => {
  it("rewrites localhost configured URL for Android dev", () => {
    expect(
      resolveNativeApiUrl({
        configuredUrl: "http://localhost:3536",
        debuggerHost: "192.168.0.10:8081",
        isDev: true,
        platform: "android",
      }),
    ).toBe("http://192.168.0.10:3536");
  });

  it("falls back to Android emulator host in dev", () => {
    expect(
      resolveNativeApiUrl({
        isDev: true,
        platform: "android",
      }),
    ).toBe("http://10.0.2.2:3456");
  });

  it("ignores localhost debugger host on Android dev", () => {
    expect(
      resolveNativeApiUrl({
        configuredUrl: "http://localhost:3536",
        debuggerHost: "localhost:8081",
        isDev: true,
        platform: "android",
      }),
    ).toBe("http://10.0.2.2:3536");
  });

  it("falls back to Android emulator host when debugger host is localhost", () => {
    expect(
      resolveNativeApiUrl({
        debuggerHost: "localhost:8081",
        isDev: true,
        platform: "android",
      }),
    ).toBe("http://10.0.2.2:3456");
  });

  it("keeps localhost for iOS dev", () => {
    expect(
      resolveNativeApiUrl({
        configuredUrl: "http://localhost:3536",
        isDev: true,
        platform: "ios",
      }),
    ).toBe("http://localhost:3536");
  });

  it("uses debugger host when no URL is configured", () => {
    expect(
      resolveNativeApiUrl({
        debuggerHost: "10.1.2.3:8081",
        isDev: true,
        platform: "ios",
      }),
    ).toBe("http://10.1.2.3:3456");
  });

  it("throws when production URL is missing", () => {
    expect(() =>
      resolveNativeApiUrl({
        isDev: false,
        platform: "ios",
      }),
    ).toThrow(
      "EXPO_PUBLIC_API_URL is not set. Production builds require this environment variable.",
    );
  });
});
