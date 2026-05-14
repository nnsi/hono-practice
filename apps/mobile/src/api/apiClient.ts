import { hc } from "hono/client";

// biome-ignore lint/style/noRestrictedImports: Hono adapter boundary intentionally depends on AppType.
import type { AppType } from "@backend/app";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { resolveNativeApiUrl } from "../utils/apiUrlResolver";
import { customFetch } from "./customFetch";

function resolveApiUrl(): string {
  const configuredUrl =
    (Platform.OS === "android"
      ? process.env.EXPO_PUBLIC_API_URL_ANDROID
      : Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_API_URL_IOS
        : process.env.EXPO_PUBLIC_API_URL_WEB) ??
    process.env.EXPO_PUBLIC_API_URL;
  return resolveNativeApiUrl({
    configuredUrl,
    debuggerHost: Constants.expoGoConfig?.debuggerHost,
    isDev: __DEV__,
    platform: Platform.OS,
  });
}

const API_URL = resolveApiUrl();

export const apiClient = hc<AppType>(API_URL, { fetch: customFetch });
export const getApiUrl = () => API_URL;
