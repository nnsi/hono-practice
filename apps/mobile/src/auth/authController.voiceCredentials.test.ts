import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callbacks: undefined as
    | {
        onAuthStateReset: () => void;
        onUserSwitch: () => Promise<void>;
        onUserSynced: (user: {
          id: string;
          plan: string;
          tabPreference: unknown;
        }) => Promise<void>;
      }
    | undefined,
  clearLocalData: vi.fn(),
  clearStoredTabPreference: vi.fn(),
  clearVoiceCredentials: vi.fn(),
  provisionVoiceApiKey: vi.fn(),
}));

vi.mock("@packages/auth-client", () => ({
  createAuthController: vi.fn((options) => {
    mocks.callbacks = options;
    return options;
  }),
  createRefreshAccessTokenCallback: vi.fn(() => vi.fn()),
}));
vi.mock("@react-native-community/netinfo", () => ({
  default: { addEventListener: vi.fn() },
}));
vi.mock("../api/apiClient", () => ({ getApiUrl: () => "https://api.test" }));
vi.mock("../api/customFetch", () => ({ setRefreshAccessToken: vi.fn() }));
vi.mock("../components/setting/tabPreferenceStore", () => ({
  clearStoredTabPreference: mocks.clearStoredTabPreference,
  flushPendingTabPreference: vi.fn(),
  reconcileTabPreferenceFromServer: vi.fn(),
}));
vi.mock("../lib/provisionVoiceApiKey", () => ({
  provisionVoiceApiKey: mocks.provisionVoiceApiKey,
}));
vi.mock("../lib/voiceApiKeyBridge", () => ({
  clearVoiceCredentials: mocks.clearVoiceCredentials,
}));
vi.mock("../sync/initialSync", () => ({
  clearLocalData: mocks.clearLocalData,
  performInitialSync: vi.fn(),
}));
vi.mock("../sync/rnPlatformAdapters", () => ({ loadStorageCache: vi.fn() }));
vi.mock("./mobileAuthStateRepository", () => ({
  createMobileAuthStateRepository: vi.fn(() => ({})),
}));
vi.mock("./mobileAuthTransport", () => ({
  createMobileAuthTransport: vi.fn(() => ({})),
}));

await import("./authController");

describe("authController voice credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clearVoiceCredentials.mockResolvedValue(undefined);
    mocks.clearLocalData.mockResolvedValue(undefined);
    mocks.provisionVoiceApiKey.mockResolvedValue(undefined);
  });

  it("clears the previous user's credentials before local user data", async () => {
    await mocks.callbacks?.onUserSwitch();

    expect(mocks.clearVoiceCredentials).toHaveBeenCalledOnce();
    expect(mocks.clearLocalData).toHaveBeenCalledOnce();
    expect(
      mocks.clearVoiceCredentials.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.clearLocalData.mock.invocationCallOrder[0]);
  });

  it("clears credentials when authentication state is reset", () => {
    mocks.callbacks?.onAuthStateReset();

    expect(mocks.clearVoiceCredentials).toHaveBeenCalledOnce();
    expect(mocks.clearStoredTabPreference).toHaveBeenCalledOnce();
  });

  it("provisions premium credentials for the synchronized user", async () => {
    await mocks.callbacks?.onUserSynced({
      id: "user-2",
      plan: "premium",
      tabPreference: null,
    });

    expect(mocks.provisionVoiceApiKey).toHaveBeenCalledWith("user-2");
  });
});
