import {
  createAuthController,
  createRefreshAccessTokenCallback,
} from "@packages/auth-client";

import { getApiUrl } from "../api/apiClient";
import { customFetch, setRefreshAccessToken } from "../api/customFetch";
import { tokenHolder } from "../api/tokenHolder";
import {
  clearStoredTabPreference,
  flushPendingTabPreference,
  reconcileTabPreferenceFromServer,
} from "../components/setting/tabPreferenceStore";
import { queryClient } from "../queryClient";
import { clearLocalData, performInitialSync } from "../sync/initialSync";
import { createWebAuthStateRepository } from "./webAuthStateRepository";
import { createWebAuthTransport } from "./webAuthTransport";

const transport = createWebAuthTransport(
  { apiUrl: getApiUrl(), authenticatedFetch: customFetch },
  tokenHolder,
);

setRefreshAccessToken(createRefreshAccessTokenCallback(transport));

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
  },
  onAuthStateReset: () => {
    clearStoredTabPreference();
    queryClient.clear();
  },
});
