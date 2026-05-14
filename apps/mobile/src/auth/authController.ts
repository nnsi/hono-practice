import { createAuthController } from "@packages/auth-client";
import NetInfo from "@react-native-community/netinfo";

import { getApiUrl } from "../api/apiClient";
import { setRefreshAccessToken } from "../api/customFetch";
import { tokenHolder } from "../api/tokenHolder";
import {
  clearStoredTabPreference,
  flushPendingTabPreference,
  reconcileTabPreferenceFromServer,
} from "../components/setting/tabPreferenceStore";
import { provisionVoiceApiKey } from "../lib/provisionVoiceApiKey";
import { clearLocalData, performInitialSync } from "../sync/initialSync";
import { createMobileAuthStateRepository } from "./mobileAuthStateRepository";
import { createMobileAuthTransport } from "./mobileAuthTransport";

const transport = createMobileAuthTransport(
  { apiUrl: getApiUrl() },
  tokenHolder,
);

setRefreshAccessToken(async () => {
  const result = await transport.refreshSession();
  if (result.kind !== "ok") return null;
  // 401 retry 経由でも新 access token を tokenHolder に反映する。これを忘れると
  // retry 直後の1リクエストだけ新 token で送られ、後続は古い tokenHolder を読む。
  // Mobile では refreshSession 内の persistSession が refresh token のみ書くので
  // access token のメモリ反映はここでも明示する必要がある
  transport.setAccessToken(result.session.token);
  return result.session.token;
});

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
