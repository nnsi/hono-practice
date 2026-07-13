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
import { clearVoiceCredentials } from "../lib/voiceApiKeyBridge";
import { clearLocalData, performInitialSync } from "../sync/initialSync";
import { loadStorageCache } from "../sync/rnPlatformAdapters";
import { createMobileAuthStateRepository } from "./mobileAuthStateRepository";
import { createMobileAuthTransport } from "./mobileAuthTransport";

const transport = createMobileAuthTransport(
  { apiUrl: getApiUrl() },
  tokenHolder,
);

setRefreshAccessToken(createRefreshAccessTokenCallback(transport));

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
    await clearVoiceCredentials();
    await clearLocalData();
  },
  performInitialSync: async (userId) => {
    await loadStorageCache();
    await performInitialSync(userId);
  },
  onUserSynced: async (user) => {
    await reconcileTabPreferenceFromServer(user.tabPreference);
    void flushPendingTabPreference();
    if (user.plan === "premium") {
      provisionVoiceApiKey(user.id).catch(() => {});
    }
  },
  onAuthStateReset: () => {
    void clearVoiceCredentials();
    void clearStoredTabPreference();
  },
});
