import {
  createAuthController,
  createRefreshAccessTokenCallback,
} from "@packages/auth-client";

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
import {
  mobileAuthDiagnosticHeaders,
  mobileAuthDiagnostics,
} from "./mobileAuthDiagnostics";
import { createMobileAuthStateRepository } from "./mobileAuthStateRepository";
import { createMobileAuthTransport } from "./mobileAuthTransport";
import { mobileOnlineRetryAdapter } from "./mobileOnlineRetryAdapter";

const transport = createMobileAuthTransport(
  {
    apiUrl: getApiUrl(),
    onDiagnostic: mobileAuthDiagnostics.observe,
    diagnosticHeaders: mobileAuthDiagnosticHeaders,
  },
  tokenHolder,
);

export const authController = createAuthController({
  transport,
  authStateRepo: createMobileAuthStateRepository(),
  onDiagnostic: mobileAuthDiagnostics.observe,
  online: mobileOnlineRetryAdapter,
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

setRefreshAccessToken(
  createRefreshAccessTokenCallback(transport, {
    getSessionVersion: () => authController.getSessionVersion(),
    onExpired: () => authController.forceLogout("refresh_expired"),
    onDiagnostic: mobileAuthDiagnostics.observe,
  }),
  () => authController.getSessionIdentityVersion(),
);
