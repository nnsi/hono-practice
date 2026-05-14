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
  return result.kind === "ok" ? result.session.token : null;
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
