import { createAuthController } from "@packages/auth-client";

import { getApiUrl } from "../api/apiClient";
import { setRefreshAccessToken } from "../api/customFetch";
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

const transport = createWebAuthTransport({ apiUrl: getApiUrl() }, tokenHolder);

setRefreshAccessToken(async () => {
  const result = await transport.refreshSession();
  if (result.kind !== "ok") return null;
  // 401 retry 経由でも新 access token を tokenHolder に反映する。これを忘れると
  // retry 直後の1リクエストだけ新 token で送られ、後続は古い tokenHolder を読む
  transport.setAccessToken(result.session.token);
  return result.session.token;
});

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
