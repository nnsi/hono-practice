export const DEFAULT_DEV_API_PORT = 3456;
const ANDROID_EMULATOR_HOST = "10.0.2.2";

type ResolveApiUrlOptions = {
  configuredUrl?: string;
  debuggerHost?: string | null;
  isDev: boolean;
  platform: "android" | "ios" | "web" | "windows" | "macos";
};

function getDebuggerHostName(debuggerHost?: string | null): string | null {
  if (!debuggerHost) return null;
  return debuggerHost.split(":")[0] || null;
}

function rewriteConfiguredUrlForAndroidDev(
  configuredUrl: string,
  debuggerHost?: string | null,
): string {
  const parsed = new URL(configuredUrl);
  if (
    parsed.hostname !== "localhost" &&
    parsed.hostname !== "127.0.0.1" &&
    parsed.hostname !== "::1"
  ) {
    return configuredUrl;
  }

  parsed.hostname = getDebuggerHostName(debuggerHost) ?? ANDROID_EMULATOR_HOST;
  return parsed.toString().replace(/\/$/, "");
}

export function resolveNativeApiUrl({
  configuredUrl,
  debuggerHost,
  isDev,
  platform,
}: ResolveApiUrlOptions): string {
  if (configuredUrl) {
    if (isDev && platform === "android") {
      return rewriteConfiguredUrlForAndroidDev(configuredUrl, debuggerHost);
    }
    return configuredUrl;
  }

  if (!isDev) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set. Production builds require this environment variable.",
    );
  }

  const host = getDebuggerHostName(debuggerHost);
  if (host) {
    return `http://${host}:${DEFAULT_DEV_API_PORT}`;
  }

  if (platform === "android") {
    return `http://${ANDROID_EMULATOR_HOST}:${DEFAULT_DEV_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_DEV_API_PORT}`;
}
