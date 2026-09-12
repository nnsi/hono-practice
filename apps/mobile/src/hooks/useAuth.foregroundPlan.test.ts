import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refreshPlanFromBackend: vi.fn(),
  provisionVoiceApiKey: vi.fn(),
}));

vi.mock("../auth/planReconciliation", () => ({
  refreshPlanFromBackend: mocks.refreshPlanFromBackend,
}));
vi.mock("../lib/provisionVoiceApiKey", () => ({
  provisionVoiceApiKey: mocks.provisionVoiceApiKey,
}));
vi.mock("../auth/authController", () => ({
  authController: {
    login: vi.fn(),
    googleLogin: vi.fn(),
    appleLogin: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));
vi.mock("../auth/mobileAuthDiagnostics", () => ({
  startMobileAuthDiagnosticFlush: vi.fn(),
}));
vi.mock("@packages/auth-client", () => ({
  useAuthBootstrap: vi.fn(),
  useAuthController: vi.fn(),
}));

import { refreshForegroundEntitlement } from "./useAuth";

describe("foreground entitlement refresh", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists a Pro to Free downgrade without provisioning a premium key", async () => {
    mocks.refreshPlanFromBackend.mockResolvedValue("free");

    await refreshForegroundEntitlement("user-1");

    expect(mocks.refreshPlanFromBackend).toHaveBeenCalledOnce();
    expect(mocks.provisionVoiceApiKey).not.toHaveBeenCalled();
  });

  it("provisions the voice key after persisting a premium upgrade", async () => {
    mocks.refreshPlanFromBackend.mockResolvedValue("premium");

    await refreshForegroundEntitlement("user-1");

    expect(mocks.provisionVoiceApiKey).toHaveBeenCalledWith("user-1");
  });
});
