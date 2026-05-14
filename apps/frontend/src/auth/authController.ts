import { hc } from "hono/client";

// biome-ignore lint/style/noRestrictedImports: Hono adapter boundary intentionally depends on AppType.
import type { AppType } from "@backend/app";
import {
  createAuthController,
  createAuthenticatedFetch,
} from "@packages/auth-client";

import {
  clearStoredTabPreference,
  flushPendingTabPreference,
  reconcileTabPreferenceFromServer,
} from "../components/setting/tabPreferenceStore";
import { clearLocalData, performInitialSync } from "../sync/initialSync";
import { createWebAuthStateRepository } from "./webAuthStateRepository";
import { createWebAuthTransport } from "./webAuthTransport";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3456"
).replace(/\/+$/, "");

let accessToken: string | null = null;
const tokenHolder = {
  getToken: () => accessToken,
  setToken: (token: string | null) => {
    accessToken = token;
  },
};

let queryClientResetRef: (() => void) | null = null;

const transport = createWebAuthTransport({ apiUrl: API_URL }, tokenHolder);

const { fetch: customFetch } = createAuthenticatedFetch({
  tokenSource: tokenHolder,
  refreshAccessToken: async () => {
    const result = await transport.refreshSession();
    return result.kind === "ok" ? result.session.token : null;
  },
  includeCredentialsForAuthEndpoints: true,
});

export { customFetch };
export const apiClient = hc<AppType>(API_URL, { fetch: customFetch });
export const getApiUrl = () => API_URL;

export function setQueryClientReset(reset: () => void) {
  queryClientResetRef = reset;
}

export const authController = createAuthController({
  transport,
  authStateRepo: createWebAuthStateRepository(),
  online: {
    registerOnlineRetry(handler) {
      window.addEventListener("online", handler);
      return () => window.removeEventListener("online", handler);
    },
  },
  onUserSwitch: async () => {
    await clearLocalData();
  },
  performInitialSync: async (userId) => {
    await performInitialSync(userId);
  },
  onUserSynced: async (user) => {
    reconcileTabPreferenceFromServer(user.tabPreference);
    void flushPendingTabPreference();
    // plan は applySession 内で setPlan 経由で書かれるので二重更新しない
  },
  onAuthStateReset: () => {
    clearStoredTabPreference();
    queryClientResetRef?.();
  },
});

export function setToken(token: string) {
  tokenHolder.setToken(token);
}

export function clearToken() {
  tokenHolder.setToken(null);
}
