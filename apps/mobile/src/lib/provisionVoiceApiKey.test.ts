import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearVoiceCredentials: vi.fn(),
  customFetch: vi.fn(),
  getVoiceCredentialOwner: vi.fn(),
  hasVoiceApiKey: vi.fn(),
  saveVoiceCredentials: vi.fn(),
}));

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("../api/apiClient", () => ({
  getApiUrl: () => "https://api.example.com",
}));
vi.mock("../api/customFetch", () => ({ customFetch: mocks.customFetch }));
vi.mock("./voiceApiKeyBridge", () => ({
  clearVoiceCredentials: mocks.clearVoiceCredentials,
  getVoiceCredentialOwner: mocks.getVoiceCredentialOwner,
  hasVoiceApiKey: mocks.hasVoiceApiKey,
  saveVoiceCredentials: mocks.saveVoiceCredentials,
}));

import { provisionVoiceApiKey } from "./provisionVoiceApiKey";

describe("provisionVoiceApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clearVoiceCredentials.mockResolvedValue(undefined);
    mocks.saveVoiceCredentials.mockResolvedValue(undefined);
  });

  it("keeps a key only when it belongs to the active user", async () => {
    mocks.hasVoiceApiKey.mockResolvedValue(true);
    mocks.getVoiceCredentialOwner.mockResolvedValue("user-1");

    await provisionVoiceApiKey("user-1");

    expect(mocks.clearVoiceCredentials).not.toHaveBeenCalled();
    expect(mocks.customFetch).not.toHaveBeenCalled();
  });

  it("clears and reissues credentials when the stored owner differs", async () => {
    mocks.hasVoiceApiKey.mockResolvedValue(true);
    mocks.getVoiceCredentialOwner.mockResolvedValue("user-1");
    mocks.customFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ apiKey: { key: "new-key" } }),
    });

    await provisionVoiceApiKey("user-2");

    expect(mocks.clearVoiceCredentials).toHaveBeenCalledOnce();
    expect(mocks.customFetch).toHaveBeenCalledWith(
      "https://api.example.com/users/api-keys",
      expect.objectContaining({ method: "POST" }),
    );
    expect(mocks.saveVoiceCredentials).toHaveBeenCalledWith(
      "new-key",
      "https://api.example.com",
      "user-2",
    );
  });

  it("reissues a legacy key without owner metadata", async () => {
    mocks.hasVoiceApiKey.mockResolvedValue(true);
    mocks.getVoiceCredentialOwner.mockResolvedValue(null);
    mocks.customFetch.mockResolvedValue({ ok: false });

    await provisionVoiceApiKey("user-2");

    expect(mocks.clearVoiceCredentials).toHaveBeenCalledOnce();
    expect(mocks.customFetch).toHaveBeenCalledOnce();
  });
});
