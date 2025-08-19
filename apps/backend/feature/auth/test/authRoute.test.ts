import { sign } from "hono/jwt";
import { testClient } from "hono/testing";

import { AuthError } from "@backend/error";
import { newRefreshTokenRepository } from "@backend/feature/auth/refreshTokenRepository";
import { newUserProviderRepository } from "@backend/feature/auth/userProviderRepository";
import { hashWithSHA256 } from "@backend/lib/hash";
import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { authMiddleware } from "@backend/middleware/authMiddleware";
import { testDB } from "@backend/test.setup";
import { refreshTokens, users } from "@infra/drizzle/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { v7 } from "uuid";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAuthRoute, newAuthHandler } from "..";
import { newUserRepository } from "../../user";
import { newAuthUsecase } from "../authUsecase";
import { SHA256PasswordVerifier } from "../passwordVerifier";

import type { OAuthVerifierMap } from "../authUsecase";
import type { OIDCPayload } from "../oauthVerify";

const mockGoogleToken = "mock-google-id-token";
const mockGoogleSub = "google-user-id-123";
const mockGoogleEmail = "testuser@example.com";
const mockGoogleName = "Googleユーザー";
const mockClientId = "test-google-client-id";

// OAuthVerifierMap型でモックを定義
const mockGoogleVerifiers: OAuthVerifierMap = {
  google: async (credential: string, clientId: string) => {
    if (credential === "invalid-token") {
      throw new AuthError("Invalid token");
    }
    if (credential === "no-sub-token") {
      return {
        iss: "https://accounts.google.com",
        sub: undefined as any,
        aud: clientId,
        exp: Date.now() / 1000 + 600,
        iat: Date.now() / 1000,
        email: mockGoogleEmail,
        name: mockGoogleName,
      };
    }
    if (credential === "no-email-token") {
      return {
        iss: "https://accounts.google.com",
        sub: mockGoogleSub,
        aud: clientId,
        exp: Date.now() / 1000 + 600,
        iat: Date.now() / 1000,
        name: mockGoogleName,
      } as OIDCPayload;
    }
    return {
      iss: "https://accounts.google.com",
      sub: mockGoogleSub,
      aud: clientId,
      exp: Date.now() / 1000 + 600,
      iat: Date.now() / 1000,
      email: mockGoogleEmail,
      name: mockGoogleName,
    };
  },
};

describe("AuthRoute Integration Tests", () => {
  const JWT_SECRET = "test-secret-integration";
  let refreshTokenRepo: ReturnType<typeof newRefreshTokenRepository>;

  const testLoginId = "integration-user-auth";
  const testPassword = "password123";
  let testUserId: string;

  const createTestApp = (
    useAuth = false,
    mockRefreshTokenRepo?: ReturnType<typeof newRefreshTokenRepository>,
    oauthVerifiers: OAuthVerifierMap = mockGoogleVerifiers,
  ) => {
    const app = newHonoWithErrorHandling();
    const authRoutes = createAuthRoute(oauthVerifiers);

    if (useAuth) {
      app.use("*", authMiddleware);
    }

    if (mockRefreshTokenRepo) {
      authRoutes.use("*", async (c, next) => {
        const userRepo = newUserRepository(testDB);
        const userProviderRepo = newUserProviderRepository(testDB);
        const passwordVerifier = new SHA256PasswordVerifier();
        const uc = newAuthUsecase(
          userRepo,
          mockRefreshTokenRepo,
          userProviderRepo,
          passwordVerifier,
          JWT_SECRET,
          oauthVerifiers,
        );
        const h = newAuthHandler(uc);

        c.set("h", h);

        return next();
      });
    }

    return app.route("/", authRoutes);
  };

  const createTestClient = (
    useAuth = false,
    mockRefreshTokenRepo?: ReturnType<typeof newRefreshTokenRepository>,
    oauthVerifiers: OAuthVerifierMap = mockGoogleVerifiers,
  ) => {
    const app = createTestApp(useAuth, mockRefreshTokenRepo, oauthVerifiers);
    return testClient(app, {
      DB: testDB,
      JWT_SECRET,
      NODE_ENV: "test",
    });
  };

  const createJwtToken = async (userId: string) => {
    return await sign({ userId }, JWT_SECRET);
  };

  beforeEach(async () => {
    refreshTokenRepo = newRefreshTokenRepository(testDB);

    await testDB.delete(refreshTokens).execute();
    await testDB.delete(users).where(eq(users.loginId, testLoginId)).execute();

    const hashedPassword = await hashWithSHA256(testPassword);
    const createdUserResult = await testDB
      .insert(users)
      .values({
        id: v7(),
        loginId: testLoginId,
        password: hashedPassword,
        name: "Integration Auth User",
      })
      .returning({ id: users.id })
      .execute();

    if (!createdUserResult || createdUserResult.length === 0) {
      throw new Error("Failed to create test user");
    }
    testUserId = createdUserResult[0].id;
  });

  afterEach(async () => {
    await testDB.delete(refreshTokens).execute();
    await testDB.delete(users).where(eq(users.id, testUserId)).execute();
  });

  describe("POST /login", () => {
    it("正常系：ログイン成功", async () => {
      const client = createTestClient();
      const res = await client.login.$post({
        json: {
          login_id: testLoginId,
          password: testPassword,
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        token: string;
        refreshToken: string;
      };
      expect(body.token).toEqual(expect.any(String));
      expect(body.refreshToken).toEqual(expect.any(String));
      // Auth cookie is no longer set, only refresh token cookie
      expect(res.headers.get("Set-Cookie")).toMatch(/refresh_token=/);

      const storedToken = await refreshTokenRepo.getRefreshTokenByToken(
        body.refreshToken,
      );
      expect(storedToken).not.toBeNull();
      expect(storedToken?.userId).toBe(testUserId);
    });

    it("異常系：認証エラー (wrong password)", async () => {
      const client = createTestClient();
      const res = await client.login.$post({
        json: { login_id: testLoginId, password: "wrong-password" },
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "invalid credentials" });
    });

    it("異常系：認証エラー (user not found)", async () => {
      const client = createTestClient();
      const res = await client.login.$post({
        json: { login_id: "non-existent-user", password: testPassword },
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "invalid credentials" });
    });

    it("異常系：リクエストボディが不正 (missing password)", async () => {
      const client = createTestClient();
      const res = await client.login.$post({
        json: { login_id: testLoginId } as any,
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("success", false);
      expect(body).toHaveProperty("error");
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        body.error &&
        typeof body.error === "object" &&
        "message" in body.error
      ) {
        // Zod 4 serializes errors as JSON string in message field
        const errorMessage = (body.error as any).message;
        const issues = JSON.parse(errorMessage);
        expect(issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: ["password"] }),
          ]),
        );
      } else {
        expect.fail("Response body did not match expected ZodError structure");
      }
    });

    it("異常系：極端に長いログインID (バリデーション未実装)", async () => {
      const client = createTestClient();
      const longLoginId = "a".repeat(1000);
      const res = await client.login.$post({
        json: { login_id: longLoginId, password: testPassword },
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("success", false);
      expect(body).toHaveProperty("error");
    });
  });

  describe("POST /token", () => {
    let validPlainRefreshToken: string;

    beforeEach(async () => {
      const client = createTestClient();
      const loginRes = await client.login.$post({
        json: { login_id: testLoginId, password: testPassword },
      });
      if (loginRes.status !== 200) {
        console.error(
          "Login failed in /token beforeEach:",
          await loginRes.text(),
        );
        throw new Error("Setup failed: Could not log in to get refresh token");
      }
      const loginBody = (await loginRes.json()) as {
        token: string;
        refreshToken: string;
      };
      validPlainRefreshToken = loginBody.refreshToken;

      const stored = await refreshTokenRepo.getRefreshTokenByToken(
        validPlainRefreshToken,
      );
      if (!stored)
        throw new Error(
          "Setup failed: refresh token not found in DB after login",
        );
    });

    it("正常系：トークンの更新成功", async () => {
      const client = createTestClient(false);
      const res = await client.token.$post(
        {},
        {
          headers: {
            Cookie: `refresh_token=${validPlainRefreshToken}`,
          },
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        token: string;
        refreshToken: string;
      };
      const newRefreshToken = body.refreshToken;
      expect(newRefreshToken).toEqual(expect.any(String));
      expect(newRefreshToken).not.toBe(validPlainRefreshToken);
      // Auth cookie is no longer set, only refresh token cookie
      expect(res.headers.get("Set-Cookie")).toMatch(/refresh_token=/);

      const oldStoredToken = await refreshTokenRepo.getRefreshTokenByToken(
        validPlainRefreshToken,
      );
      expect(oldStoredToken).toBeNull();

      const newStoredToken =
        await refreshTokenRepo.getRefreshTokenByToken(newRefreshToken);
      expect(newStoredToken).not.toBeNull();
      expect(newStoredToken?.userId).toBe(testUserId);
      expect(newStoredToken?.revokedAt).toBeNull();
    });

    it("異常系：リフレッシュトークンが無効 (not found)", async () => {
      const client = createTestClient(false);
      const res = await client.token.$post(
        {},
        {
          headers: {
            Cookie:
              "refresh_token=00000000-0000-0000-0000-000000000000.non-existent-token",
          },
        },
      );

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "invalid refresh token" });
    });

    it("異常系：リフレッシュトークンが無効 (revoked)", async () => {
      const revokedSelector = "11111111-1111-1111-1111-111111111111";
      const revokedPlainToken = "revoked-token-plain";
      const revokedHashedToken = await bcrypt.hash(revokedPlainToken, 10);
      const revokedExpiresAt = new Date(Date.now() + 1000 * 60 * 60);
      const revokedAt = new Date(Date.now() - 1000 * 60);

      await testDB.insert(refreshTokens).values({
        id: v7(),
        userId: testUserId,
        selector: revokedSelector,
        token: revokedHashedToken,
        expiresAt: revokedExpiresAt,
        revokedAt: revokedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const client = createTestClient(false);
      const res = await client.token.$post(
        {},
        {
          headers: {
            Cookie: `refresh_token=${revokedSelector}.${revokedPlainToken}`,
          },
        },
      );

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "invalid refresh token" });
    });

    it("異常系：リクエストボディが不正", async () => {
      const client = createTestClient(false);
      const res = await client.token.$post(
        {},
        {
          headers: { Cookie: "" }, // No refresh token cookie
        },
      );
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "refresh token not found" });
    });
  });

  describe("GET /logout", () => {
    let validJwtToken: string;
    let validPlainRefreshToken: string;

    beforeEach(async () => {
      validJwtToken = await createJwtToken(testUserId);
      const client = createTestClient();
      const loginRes = await client.login.$post({
        json: { login_id: testLoginId, password: testPassword },
      });
      if (loginRes.status !== 200) {
        throw new Error("Setup failed: Could not log in to get refresh token");
      }
      const loginBody = (await loginRes.json()) as {
        token: string;
        refreshToken: string;
      };
      validPlainRefreshToken = loginBody.refreshToken;
    });

    it("正常系：ログアウト成功", async () => {
      const client = createTestClient(true);
      const res = await client.logout.$post(
        {},
        {
          headers: {
            Authorization: `Bearer ${validJwtToken}`,
            Cookie: `refresh_token=${validPlainRefreshToken}`,
          },
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { message: string };
      expect(body).toEqual({ message: "success" });
      // Only refresh token cookie is cleared
      expect(res.headers.get("Set-Cookie")).toMatch(/refresh_token=;/);
    });

    it("異常系：認証されていない", async () => {
      const client = createTestClient(true);
      const res = await client.logout.$post({
        json: {
          refreshToken: validPlainRefreshToken,
        },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { message: string };
      expect(body).toEqual({ message: "unauthorized" });
    });

    it("異常系：リフレッシュトークンが提供されていない", async () => {
      const client = createTestClient(true);
      const res = await client.logout.$post(
        {},
        {
          headers: {
            Authorization: `Bearer ${validJwtToken}`,
            Cookie: "", // No refresh token
          },
        },
      );
      expect(res.status).toBe(401);
      const body = (await res.json()) as { message: string };
      expect(body).toEqual({ message: "refresh token not found" });
    });

    it("異常系：他のユーザーのリフレッシュトークン", async () => {
      // 別のユーザーのリフレッシュトークンを作成
      const otherUserId = v7();
      await testDB.insert(users).values({
        id: otherUserId,
        loginId: "other-user",
        password: await hashWithSHA256("password123"),
        name: "Other User",
      });

      const otherUserClient = createTestClient();
      const loginRes = await otherUserClient.login.$post({
        json: { login_id: "other-user", password: "password123" },
      });
      const otherUserRefreshToken = (
        (await loginRes.json()) as { refreshToken: string }
      ).refreshToken;

      const client = createTestClient(true);
      const res = await client.logout.$post(
        {},
        {
          headers: {
            Authorization: `Bearer ${validJwtToken}`,
            Cookie: `refresh_token=${otherUserRefreshToken}`,
          },
        },
      );

      expect(res.status).toBe(401);
      const body = (await res.json()) as { message: string };
      expect(body).toEqual({
        message: "unauthorized - token does not belong to user",
      });

      // クリーンアップ - まずリフレッシュトークンを削除
      await testDB
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, otherUserId))
        .execute();
      // その後ユーザーを削除
      await testDB.delete(users).where(eq(users.id, otherUserId)).execute();
    });
  });

  describe("Security Related Tests", () => {
    let validJwtToken: string;
    let validPlainRefreshToken: string;

    beforeEach(async () => {
      const client = createTestClient();
      const loginRes = await client.login.$post({
        json: { login_id: testLoginId, password: testPassword },
      });
      if (loginRes.status !== 200) {
        throw new Error("Setup failed: Could not log in for security tests");
      }
      const loginBody = (await loginRes.json()) as {
        token: string;
        refreshToken: string;
      };
      validPlainRefreshToken = loginBody.refreshToken;
      validJwtToken = await createJwtToken(testUserId);
    });

    describe("JWT Token Security", () => {
      it("異常系：改ざんされたJWTトークン", async () => {
        const client = createTestClient(true);
        const tamperedToken = `${validJwtToken.slice(0, -5)}tamper`;

        const res = await client.token.$post(
          {},
          {
            headers: {
              Cookie: `auth=${tamperedToken}; refresh_token=${validPlainRefreshToken}`,
            },
          },
        );

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ message: "unauthorized" });
      });

      it("異常系：不正なJWTシグネチャ", async () => {
        const client = createTestClient(true);
        const invalidToken = await sign({ userId: testUserId }, "wrong-secret");

        const res = await client.token.$post(
          {},
          {
            headers: {
              Cookie: `auth=${invalidToken}; refresh_token=${validPlainRefreshToken}`,
            },
          },
        );

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ message: "unauthorized" });
      });

      it("異常系：期限切れのJWTトークン", async () => {
        const client = createTestClient(true);
        const expiredToken = await sign(
          {
            userId: testUserId,
            exp: Math.floor(Date.now() / 1000) - 3600,
          },
          JWT_SECRET,
        );

        const res = await client.token.$post(
          {},
          {
            headers: {
              Cookie: `auth=${expiredToken}; refresh_token=${validPlainRefreshToken}`,
            },
          },
        );

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ message: "unauthorized" });
      });
    });

    describe("Brute Force Protection", () => {
      it.skip("異常系：連続した認証失敗 (レート制限機能未実装)", async () => {
        const client = createTestClient();
        const attempts = 10;

        for (let i = 0; i < attempts; i++) {
          const res = await client.login.$post({
            json: {
              login_id: testLoginId,
              password: `wrong-password-${i}`,
            },
          });
          expect(res.status).toBe(401);
        }

        const finalRes = await client.login.$post({
          json: {
            login_id: testLoginId,
            password: testPassword,
          },
        });

        expect(finalRes.status).toBe(429);
        expect(await finalRes.json()).toEqual({
          message: "too many login attempts",
        });
      });
    });

    describe("Input Validation Security", () => {
      it("異常系：SQLインジェクション攻撃パターンのログインID", async () => {
        const client = createTestClient();
        const res = await client.login.$post({
          json: { login_id: "' OR '1'='1", password: "password" },
        });
        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ message: "invalid credentials" });
      });

      it("異常系：特殊文字を含むパスワード", async () => {
        const client = createTestClient();
        const res = await client.login.$post({
          json: {
            login_id: testLoginId,
            password: "<script>alert('xss')</script>",
          },
        });
        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ message: "invalid credentials" });
      });
    });

    describe("Refresh Token Security", () => {
      it("異常系：リフレッシュトークンの再利用", async () => {
        const client = createTestClient(false);

        const firstRes = await client.token.$post(
          {},
          {
            headers: {
              Cookie: `refresh_token=${validPlainRefreshToken}`,
            },
          },
        );
        expect(firstRes.status).toBe(200);

        const secondRes = await client.token.$post(
          {},
          {
            headers: {
              Cookie: `refresh_token=${validPlainRefreshToken}`,
            },
          },
        );

        expect(secondRes.status).toBe(401);
        expect(await secondRes.json()).toEqual({
          message: "invalid refresh token",
        });
      });
    });
  });

  describe("POST /google", () => {
    it("正常系：Google認証で新規ユーザー作成", async () => {
      const client = createTestClient();
      const res = await client.google.$post(
        { json: { credential: mockGoogleToken } },
        { headers: { "x-client-id": mockClientId } },
      );
      if (res.status !== 200) {
        const errorBody = await res.json();
        console.error("Google auth error:", errorBody);
      }
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toEqual(expect.any(Object));
      expect(body.token).toEqual(expect.any(String));
      // Auth cookie is no longer set, only refresh token cookie
      expect(res.headers.get("Set-Cookie")).toMatch(/refresh_token=/);
    });

    it("異常系：不正なGoogleトークン", async () => {
      const client = createTestClient();
      const res = await client.google.$post(
        { json: { credential: "invalid-token" } },
        { headers: { "x-client-id": mockClientId } },
      );
      expect(res.status).toBe(401);
      const body: any = await res.json();
      expect(body.message).toMatch(/Invalid token/);
    });

    it("異常系：subがないトークン", async () => {
      const client = createTestClient();
      const res = await client.google.$post(
        { json: { credential: "no-sub-token" } },
        { headers: { "x-client-id": mockClientId } },
      );
      expect(res.status).toBe(401);
      const body: any = await res.json();
      expect(body.message).toMatch(/Missing 'sub'/);
    });

    it("異常系：emailがないトークン", async () => {
      const client = createTestClient();
      const res = await client.google.$post(
        { json: { credential: "no-email-token" } },
        { headers: { "x-client-id": mockClientId } },
      );
      expect(res.status).toBe(401);
      const body: any = await res.json();
      expect(body.message).toMatch(/Missing 'email'/);
    });
  });
});
