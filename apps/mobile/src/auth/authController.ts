import {
  createAuthController,
  createRefreshAccessTokenCallback,
} from "@packages/auth-client";
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

export const authController = createAuthController({
  transport,
  authStateRepo: createMobileAuthStateRepository(),
  online: {
    registerOnlineRetry(handler) {
      let previousConnected: boolean | null = null;
      const unsub = NetInfo.addEventListener((info) => {
        const connected = info.isConnected === true;
        if (previousConnected === null) {
          previousConnected = connected;
          return;
        }
        const recovered = !previousConnected && connected;
        previousConnected = connected;
        if (recovered) handler();
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

setRefreshAccessToken(
  createRefreshAccessTokenCallback(transport, {
    getSessionVersion: () => authController.getSessionVersion(),
    onExpired: () => authController.forceLogout(),
  }),
);
