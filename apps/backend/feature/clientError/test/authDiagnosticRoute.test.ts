import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { appendLocalLog } from "@backend/middleware/localLogWriter";
import type { AuthDiagnosticReport } from "@packages/types/authDiagnostics";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clientErrorRoute } from "../clientErrorRoute";
import { newClientErrorUsecase } from "../clientErrorUsecase";

vi.mock("@backend/middleware/localLogWriter", () => ({
  appendLocalLog: vi.fn(),
}));

const diagnostic: AuthDiagnosticReport = {
  version: 1,
  eventId: "10000000-0000-4000-8000-000000000001",
  flowId: "20000000-0000-4000-8000-000000000001",
  occurredAt: "2026-09-12T00:00:00.000Z",
  trigger: {
    event: "session_cleared",
    reason: "refresh_expired",
    source: "reconcile",
  },
  breadcrumbs: [
    {
      at: "2026-09-12T00:00:00.000Z",
      event: "refresh_result",
      reason: "http_401",
      requestId: "30000000-0000-4000-8000-000000000001",
      status: 401,
    },
  ],
};
const body = {
  errorType: "auth_diagnostic",
  message: "Auth session diagnostic",
  platform: "ios",
  appVersion: "1.0.0",
  diagnostic,
};
const createApp = () =>
  newHonoWithErrorHandling().route("/client-errors", clientErrorRoute);

describe("unauthenticated auth diagnostics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores fixed fields and allowlisted breadcrumbs after the credential has expired", async () => {
    const wae = { writeDataPoint: vi.fn() };
    const res = await createApp().request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          stack: "secret-canary",
          userId: "secret-canary",
          screen: "secret-canary",
          diagnostic: {
            ...diagnostic,
            refreshToken: "secret-canary",
            trigger: { ...diagnostic.trigger, token: "secret-canary" },
          },
        }),
      },
      {
        NODE_ENV: "production",
        WAE_CLIENT_ERRORS: wae,
        RATE_LIMIT_STORE: newMemoryRateLimitStore(),
      },
    );
    expect(res.status).toBe(204);
    expect(wae.writeDataPoint).toHaveBeenCalledOnce();
    const point = wae.writeDataPoint.mock.calls[0][0];
    expect(point.blobs.slice(0, 7)).toEqual([
      "auth_diagnostic",
      "Auth session diagnostic",
      "",
      "",
      "",
      "ios",
      "1.0.0",
    ]);
    expect(JSON.parse(point.blobs[7])).toEqual(diagnostic);
    expect(new TextEncoder().encode(point.blobs[7]).length).toBeLessThanOrEqual(
      3000,
    );
    expect(point.blobs[8]).toBe("production");
    expect(JSON.stringify(point)).not.toContain("secret-canary");
  });

  it.each([
    { ...body, message: "secret-canary" },
    { ...body, appVersion: "secret canary" },
    { ...body, diagnostic: { ...diagnostic, flowId: "secret-canary" } },
    {
      ...body,
      diagnostic: {
        ...diagnostic,
        trigger: { event: "session_cleared", reason: "secret-canary" },
      },
    },
    {
      ...body,
      diagnostic: {
        ...diagnostic,
        breadcrumbs: Array(9).fill(diagnostic.breadcrumbs[0]),
      },
    },
  ])("rejects values outside the diagnostic allowlist", async (invalid) => {
    const wae = { writeDataPoint: vi.fn() };
    const res = await createApp().request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalid),
      },
      { NODE_ENV: "test", WAE_CLIENT_ERRORS: wae },
    );
    expect(res.status).toBe(400);
    expect(wae.writeDataPoint).not.toHaveBeenCalled();
  });

  it("logging errors never prevent receipt of the terminal auth report", async () => {
    const wae = {
      writeDataPoint: vi.fn(() => {
        throw new Error("sink unavailable");
      }),
    };
    const res = await createApp().request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      { NODE_ENV: "test", WAE_CLIENT_ERRORS: wae },
    );
    expect(res.status).toBe(204);
    expect(wae.writeDataPoint).toHaveBeenCalledOnce();
  });

  it("local sink receives the same safe shape and an unknown environment is normalized", async () => {
    const usecase = newClientErrorUsecase(
      undefined,
      undefined,
      "secret-canary",
    );
    await usecase.recordClientError({
      errorType: "auth_diagnostic",
      message: "Auth session diagnostic",
      platform: "web",
      userId: "secret-canary",
      diagnostic,
    });
    expect(appendLocalLog).toHaveBeenCalledWith({
      type: "client_error",
      errorType: "auth_diagnostic",
      message: "Auth session diagnostic",
      platform: "web",
      appVersion: "",
      diagnostic,
      env: "unknown",
    });
    expect(JSON.stringify(vi.mocked(appendLocalLog).mock.calls)).not.toContain(
      "secret-canary",
    );
  });
});

import { newMemoryRateLimitStore } from "@backend/infra/rateLimit";
