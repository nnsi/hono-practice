import { createAuthDiagnosticCollector } from "@backend/lib/authDiagnostics";
import { createDefaultTabPreference } from "@packages/domain/user/tabPreferenceSchema";
import {
  createUserEntity,
  createUserId,
} from "@packages/domain/user/userSchema";
import { describe, expect, it, vi } from "vitest";

import type { UserWithProviders } from "../../user/userUsecase";
import { newAuthHandler } from "../authHandler";
import type { AuthOutput, AuthUsecase } from "../authUsecase";

const user = createUserEntity({
  type: "new",
  id: createUserId(),
  loginId: "test",
  password: null,
  name: "Test",
});
const enriched: UserWithProviders = {
  ...user,
  providers: [],
  plan: "free",
  tabPreference: createDefaultTabPreference(),
};
const output: AuthOutput = {
  user,
  userId: user.id,
  accessToken: "access-canary",
  refreshToken: "refresh-canary",
};

function fixture(enrich = async () => enriched) {
  const diagnostics = createAuthDiagnosticCollector({
    environment: "test",
    hasOrigin: false,
  });
  const uc: AuthUsecase = {
    login: async () => output,
    loginWithProvider: async () => output,
    logout: async () => {},
    linkProvider: async () => {},
    rotateRefreshToken: async () => {
      diagnostics.observe({
        reason: "rotated",
        stage: "token_persist",
        rotationCommitted: true,
      });
      return output;
    },
  };
  return {
    diagnostics,
    handler: newAuthHandler(
      uc,
      async () => enriched,
      enrich,
      diagnostics.observe,
    ),
  };
}

describe("post-commit refresh diagnostics", () => {
  it("preserves the committed flag when enrichment fails after token rotation", async () => {
    const error = new Error("private-enrichment-error-canary");
    const { handler, diagnostics } = fixture(async () => {
      throw error;
    });
    await expect(handler.rotateRefreshToken("refresh-canary")).rejects.toBe(
      error,
    );
    expect(diagnostics.snapshot()).toMatchObject({
      reason: "enrichment_failed",
      stage: "enrich_user",
      rotationCommitted: true,
    });
    expect(JSON.stringify(diagnostics.snapshot())).not.toContain("canary");
  });

  it("identifies response validation failure after a committed rotation", async () => {
    const { handler, diagnostics } = fixture(async () => ({
      ...enriched,
      name: undefined,
    }));
    await expect(handler.rotateRefreshToken("refresh-canary")).rejects.toThrow(
      "failed to parse auth response",
    );
    expect(diagnostics.snapshot()).toMatchObject({
      reason: "response_invalid",
      stage: "response",
      rotationCommitted: true,
    });
  });

  it("observer failure cannot turn a successful response into a failed refresh", async () => {
    const { handler } = fixture();
    await expect(
      handler.rotateRefreshToken("refresh-canary"),
    ).resolves.toMatchObject({ token: "access-canary" });
    const observer = vi.fn(() => {
      throw new Error("sink failed");
    });
    const uc: AuthUsecase = {
      login: async () => output,
      rotateRefreshToken: async () => output,
      loginWithProvider: async () => output,
      logout: async () => {},
      linkProvider: async () => {},
    };
    const throwing = newAuthHandler(
      uc,
      async () => enriched,
      async () => enriched,
      observer,
    );
    await expect(
      throwing.rotateRefreshToken("refresh-canary"),
    ).resolves.toMatchObject({ token: "access-canary" });
    expect(observer).toHaveBeenCalled();
  });
});
