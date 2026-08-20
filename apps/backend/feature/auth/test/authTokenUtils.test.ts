import { decode } from "hono/jwt";

import { createUserId } from "@packages/domain/user/userSchema";
import { describe, expect, it, vi } from "vitest";

import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  generateAccessToken,
} from "../authTokenUtils";

describe("access token lifetime", () => {
  it("bounds post-logout validity to 15 minutes", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const token = await generateAccessToken(
      "test-secret",
      "test-audience",
      createUserId("00000000-0000-4000-8000-000000000000"),
    );
    const { payload } = decode(token);
    expect(Number(payload.exp) - Number(payload.iat)).toBe(
      ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    );
    expect(ACCESS_TOKEN_EXPIRES_IN_SECONDS).toBe(15 * 60);
    vi.restoreAllMocks();
  });
});
