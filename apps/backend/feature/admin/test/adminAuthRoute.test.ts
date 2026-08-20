import { Hono } from "hono";

import { describe, expect, it, vi } from "vitest";

import type { OAuthVerify } from "../../auth/oauthVerify";
import { createAdminAuthRoute } from "../adminAuthRoute";
import { ADMIN_SESSION_TTL_MS } from "../adminSessionPolicy";
import type { AdminSessionRepository } from "../adminSessionRepository";

function createRepository(): AdminSessionRepository {
  return {
    createAdminSession: vi.fn().mockResolvedValue({
      token: "opaque-session-token",
      session: {
        id: "00000000-0000-4000-8000-000000000001",
        email: "admin@example.com",
        name: "Admin",
        expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
      },
    }),
    findActiveAdminSessionByToken: vi.fn().mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      email: "admin@example.com",
      name: "Admin",
      expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
    }),
    revokeAdminSessionByToken: vi.fn().mockResolvedValue(undefined),
  };
}

function buildApp(
  repository: AdminSessionRepository,
  verifyGoogle?: OAuthVerify,
) {
  const app = new Hono();
  app.onError((error: Error & { status?: number }, c) =>
    c.json({ message: error.message }, (error.status ?? 500) as 401 | 500),
  );
  app.route(
    "/",
    createAdminAuthRoute({ sessionRepository: repository, verifyGoogle }),
  );
  return app;
}

describe("admin HttpOnly sessions", () => {
  it("creates a one-hour opaque session cookie for local dev login", async () => {
    const repository = createRepository();
    const before = Date.now();
    const response = await buildApp(repository).request(
      "/dev-login",
      { method: "POST", headers: { Host: "localhost:3456" } },
      { NODE_ENV: "development", APP_URL: "http://localhost:2460" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain(
      "admin_session=opaque-session-token",
    );
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(response.headers.get("Set-Cookie")).toContain("Path=/admin");
    const expiresAt = vi.mocked(repository.createAdminSession).mock.calls[0][2];
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + ADMIN_SESSION_TTL_MS,
    );
  });

  it("restores an allowed current session without returning its token", async () => {
    const repository = createRepository();
    const response = await buildApp(repository).request(
      "/session",
      { headers: { Cookie: "admin_session=opaque-session-token" } },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:2460",
        ADMIN_ALLOWED_EMAILS: "admin@example.com",
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      email: "admin@example.com",
      name: "Admin",
    });
  });

  it("revokes a session immediately when the live email allowlist changes", async () => {
    const repository = createRepository();
    const response = await buildApp(repository).request(
      "/session",
      { headers: { Cookie: "admin_session=opaque-session-token" } },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:2460",
        ADMIN_ALLOWED_EMAILS: "different@example.com",
      },
    );

    expect(response.status).toBe(401);
    expect(repository.revokeAdminSessionByToken).toHaveBeenCalledWith(
      "opaque-session-token",
    );
    expect(response.headers.get("Set-Cookie")).toContain("Expires=");
  });

  it("revokes the DB session and clears the cookie on logout", async () => {
    const repository = createRepository();
    const response = await buildApp(repository).request(
      "/logout",
      {
        method: "POST",
        headers: { Cookie: "admin_session=opaque-session-token" },
      },
      { NODE_ENV: "test", APP_URL: "http://localhost:2460" },
    );

    expect(response.status).toBe(200);
    expect(repository.revokeAdminSessionByToken).toHaveBeenCalledWith(
      "opaque-session-token",
    );
    expect(response.headers.get("Set-Cookie")).toContain("admin_session=");
  });

  it("uses a cross-site secure cookie for production Google login", async () => {
    const repository = createRepository();
    const verifyGoogle = vi.fn().mockResolvedValue({
      iss: "https://accounts.google.com",
      sub: "google-user",
      aud: "google-client",
      exp: 2_000_000_000,
      iat: 1_900_000_000,
      email: "admin@example.com",
      email_verified: true,
      name: "Admin",
    });

    const response = await buildApp(repository, verifyGoogle).request(
      "/google",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://admin.example.com",
        },
        body: JSON.stringify({ credential: "valid-credential" }),
      },
      {
        NODE_ENV: "production",
        ADMIN_APP_URL: "https://admin.example.com",
        ADMIN_ALLOWED_EMAILS: "admin@example.com",
        GOOGLE_OAUTH_CLIENT_ID: "google-client",
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain("Secure");
    expect(response.headers.get("Set-Cookie")).toContain("SameSite=None");
    expect(verifyGoogle).toHaveBeenCalledWith("valid-credential", [
      "google-client",
    ]);
  });

  it("rejects an untrusted production origin before authentication", async () => {
    const repository = createRepository();
    const verifyGoogle = vi.fn();
    const response = await buildApp(repository, verifyGoogle).request(
      "/google",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://attacker.example",
        },
        body: JSON.stringify({ credential: "credential" }),
      },
      {
        NODE_ENV: "production",
        ADMIN_APP_URL: "https://admin.example.com",
        ADMIN_ALLOWED_EMAILS: "admin@example.com",
      },
    );

    expect(response.status).toBe(403);
    expect(verifyGoogle).not.toHaveBeenCalled();
  });

  it("rejects the general web origin for production admin authentication", async () => {
    const repository = createRepository();
    const verifyGoogle = vi.fn();
    const response = await buildApp(repository, verifyGoogle).request(
      "/google",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://app.example.com",
        },
        body: JSON.stringify({ credential: "credential" }),
      },
      {
        NODE_ENV: "production",
        ADMIN_APP_URL: "https://admin.example.com",
        APP_URL: "https://app.example.com",
        APP_URL_V2: "https://next.example.com",
        ADMIN_ALLOWED_EMAILS: "admin@example.com",
      },
    );

    expect(response.status).toBe(403);
    expect(verifyGoogle).not.toHaveBeenCalled();
  });

  it("rejects an expired or revoked DB session and clears its cookie", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveAdminSessionByToken).mockResolvedValue(
      undefined,
    );
    const response = await buildApp(repository).request(
      "/session",
      { headers: { Cookie: "admin_session=expired-token" } },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:2460",
        ADMIN_ALLOWED_EMAILS: "admin@example.com",
      },
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("Set-Cookie")).toContain("admin_session=");
  });
});
