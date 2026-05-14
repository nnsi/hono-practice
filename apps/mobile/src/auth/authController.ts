import { hc } from "hono/client";

// biome-ignore lint/style/noRestrictedImports: Hono adapter boundary intentionally depends on AppType.
import type { AppType } from "@backend/app";
import {
  createAuthController,
  createAuthenticatedFetch,
} from "@packages/auth-client";
import NetInfo from "@react-native-community/netinfo";
import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  clearStoredTabPreference,
  flushPendingTabPreference,
  reconcileTabPreferenceFromServer,
} from "../components/setting/tabPreferenceStore";
import { provisionVoiceApiKey } from "../lib/provisionVoiceApiKey";
import { clearLocalData, performInitialSync } from "../sync/initialSync";
import { resolveNativeApiUrl } from "../utils/apiUrlResolver";
import { createMobileAuthStateRepository } from "./mobileAuthStateRepository";
import { createMobileAuthTransport } from "./mobileAuthTransport";

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
export const getApiUrl = () => API_URL;

let accessToken: string | null = null;
const tokenHolder = {
  getToken: () => accessToken,
  setToken: (token: string | null) => {
    accessToken = token;
  },
};

const transport = createMobileAuthTransport({ apiUrl: API_URL }, tokenHolder);

const { fetch: customFetch } = createAuthenticatedFetch({
  tokenSource: tokenHolder,
  refreshAccessToken: async () => {
    const result = await transport.refreshSession();
    return result.kind === "ok" ? result.session.token : null;
  },
  requestTimeoutMs: 15_000,
});

export { customFetch };
export const apiClient = hc<AppType>(API_URL, { fetch: customFetch });

export const authController = createAuthController({
  transport,
  authStateRepo: createMobileAuthStateRepository(),
  online: {
    registerOnlineRetry(handler) {
      const unsub = NetInfo.addEventListener((info) => {
        if (info.isConnected) handler();
      });
      return unsub;
    },
  },
  onUserSwitch: async () => {
    await clearLocalData();
  },
  performInitialSync: async (userId) => {
    await performInitialSync(userId);
  },
  onUserSynced: async (user) => {
    await reconcileTabPreferenceFromServer(user.tabPreference);
    void flushPendingTabPreference();
    if (user.plan === "premium") {
      provisionVoiceApiKey().catch(() => {});
    }
  },
  onAuthStateReset: () => {
    void clearStoredTabPreference();
  },
});

export function setToken(token: string) {
  tokenHolder.setToken(token);
}

export function clearToken() {
  tokenHolder.setToken(null);
}
