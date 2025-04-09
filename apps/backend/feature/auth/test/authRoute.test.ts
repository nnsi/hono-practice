import { sign } from "hono/jwt";
import { testClient } from "hono/testing";

import { newRefreshTokenRepository } from "@backend/feature/auth/refreshTokenRepository";
import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { authMiddleware } from "@backend/middleware/authMiddleware";
import { testDB } from "@backend/test.setup";
import { refreshTokens, users } from "@infra/drizzle/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { expect, describe, it, beforeEach, afterEach } from "vitest";

import { createAuthRoute, newAuthHandler } from "..";
import { newUserRepository } from "../../user";
import { newAuthUsecase } from "../authUsecase";
import { BcryptPasswordVerifier } from "../passwordVerifier";

describe("AuthRoute Integration Tests", () => {
  const JWT_SECRET = "test-secret-integration";
  let refreshTokenRepo: ReturnType<typeof newRefreshTokenRepository>;

  const testLoginId = "integration-user-auth";
  const testPassword = "password123";
  let testUserId: string;

  const createTestApp = (
    useAuth = false,
    mockRefreshTokenRepo?: ReturnType<typeof newRefreshTokenRepository>,
  ) => {
    const app = newHonoWithErrorHandling();
    const authRoutes = createAuthRoute();

    if (useAuth) {
      app.use("*", authMiddleware);
    }

    if (mockRefreshTokenRepo) {
      authRoutes.use("*", async (c, next) => {
        const userRepo = newUserRepository(testDB);
        const passwordVerifier = new BcryptPasswordVerifier();
        const uc = newAuthUsecase(
          userRepo,
          mockRefreshTokenRepo,
          passwordVerifier,
          JWT_SECRET,
        );
        const h = newAuthHandler(uc);

        c.set("repo", userRepo);
        c.set("refreshTokenRepo", mockRefreshTokenRepo);
        c.set("uc", uc);
        c.set("h", h);

        return next();
      });
    }

    return app.route("/", authRoutes);
  };

  const createTestClient = (
    useAuth = false,
    mockRefreshTokenRepo?: ReturnType<typeof newRefreshTokenRepository>,
  ) => {
    const app = createTestApp(useAuth, mockRefreshTokenRepo);
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

    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const createdUserResult = await testDB
      .insert(users)
      .values({
        id: crypto.randomUUID(),
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
      expect(res.headers.get("Set-Cookie")).toMatch(/auth=/);

      const storedToken = await refreshTokenRepo.findByToken(body.refreshToken);
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
        "issues" in body.error
      ) {
        expect((body.error as any).issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: ["password"] }),
          ]),
        );
      } else {
        expect.fail("Response body did not match expected ZodError structure");
      }
    });
  });

  describe("POST /token", () => {
    let validPlainRefreshToken: string;
    let validJwtToken: string;

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
      validJwtToken = await createJwtToken(testUserId);

      const stored = await refreshTokenRepo.findByToken(validPlainRefreshToken);
      if (!stored)
        throw new Error(
          "Setup failed: refresh token not found in DB after login",
        );
    });

    it("正常系：トークンの更新成功", async () => {
      const client = createTestClient(true);
      const res = await client.token.$post(
        {
          json: { refreshToken: validPlainRefreshToken },
        },
        {
          headers: { Authorization: `Bearer ${validJwtToken}` },
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
      expect(res.headers.get("Set-Cookie")).toMatch(/auth=/);

      const oldStoredToken = await refreshTokenRepo.findByToken(
        validPlainRefreshToken,
      );
      expect(oldStoredToken).toBeNull();

      const newStoredToken =
        await refreshTokenRepo.findByToken(newRefreshToken);
      expect(newStoredToken).not.toBeNull();
      expect(newStoredToken?.userId).toBe(testUserId);
      expect(newStoredToken?.revokedAt).toBeNull();
    });

    it("異常系：リフレッシュトークンが無効 (not found)", async () => {
      const client = createTestClient(true);
      const res = await client.token.$post(
        {
          json: { refreshToken: "invalid-token-does-not-exist" },
        },
        {
          headers: { Authorization: `Bearer ${validJwtToken}` },
        },
      );

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "invalid refresh token" });
    });

    it("異常系：リフレッシュトークンが無効 (revoked)", async () => {
      const storedToken = await refreshTokenRepo.findByToken(
        validPlainRefreshToken,
      );
      if (!storedToken) throw new Error("Setup failed: token not found");
      await refreshTokenRepo.revoke(storedToken.id);

      const client = createTestClient(true);
      const res = await client.token.$post(
        {
          json: { refreshToken: validPlainRefreshToken },
        },
        {
          headers: { Authorization: `Bearer ${validJwtToken}` },
        },
      );

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "invalid refresh token" });
    });

    it("異常系：リクエストボディが不正", async () => {
      const client = createTestClient(true);
      const res = await client.token.$post(
        {
          json: {} as any,
        },
        {
          headers: { Authorization: `Bearer ${validJwtToken}` },
        },
      );

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
        "issues" in body.error &&
        Array.isArray((body.error as any).issues)
      ) {
        expect((body.error as any).issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: ["refreshToken"] }),
          ]),
        );
      } else {
        expect.fail("Response body did not match expected ZodError structure");
      }
    });
  });

  describe("GET /logout", () => {
    let validJwtToken: string;

    beforeEach(async () => {
      validJwtToken = await createJwtToken(testUserId);
    });

    it("正常系：ログアウト成功", async () => {
      const client = createTestClient(true);
      const res = await client.logout.$get(
        {},
        {
          headers: {
            Authorization: `Bearer ${validJwtToken}`,
          },
        },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { message: string };
      expect(body).toEqual({ message: "success" });
      expect(res.headers.get("Set-Cookie")).toMatch(/auth=;/);
      expect(res.headers.get("Set-Cookie")).toMatch(/refresh_token=;/);
    });

    it("異常系：認証されていない", async () => {
      const client = createTestClient(true);
      const res = await client.logout.$get();

      expect(res.status).toBe(401);
      const body = (await res.json()) as { message: string };
      expect(body).toEqual({ message: "unauthorized" });
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
          {
            json: { refreshToken: validPlainRefreshToken },
          },
          {
            headers: { Authorization: `Bearer ${tamperedToken}` },
          },
        );

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ message: "unauthorized" });
      });

      it("異常系：不正なJWTシグネチャ", async () => {
        const client = createTestClient(true);
        const invalidToken = await sign({ userId: testUserId }, "wrong-secret");

        const res = await client.token.$post(
          {
            json: { refreshToken: validPlainRefreshToken },
          },
          {
            headers: { Authorization: `Bearer ${invalidToken}` },
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
          {
            json: { refreshToken: validPlainRefreshToken },
          },
          {
            headers: { Authorization: `Bearer ${expiredToken}` },
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
          json: {
            login_id: "' OR '1'='1",
            password: testPassword,
          },
        });

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ message: "invalid credentials" });
      });

      it("異常系：極端に長いログインID (バリデーション未実装)", async () => {
        const client = createTestClient();
        const res = await client.login.$post({
          json: {
            login_id: "a".repeat(1000),
            password: testPassword,
          },
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toHaveProperty("success", false);
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
        const client = createTestClient(true);

        // 最初のトークン更新
        const firstRes = await client.token.$post(
          {
            json: { refreshToken: validPlainRefreshToken },
          },
          {
            headers: { Authorization: `Bearer ${validJwtToken}` },
          },
        );
        expect(firstRes.status).toBe(200);

        // 同じリフレッシュトークンでの2回目の更新試行
        const secondRes = await client.token.$post(
          {
            json: { refreshToken: validPlainRefreshToken },
          },
          {
            headers: { Authorization: `Bearer ${validJwtToken}` },
          },
        );

        expect(secondRes.status).toBe(401);
        expect(await secondRes.json()).toEqual({
          message: "invalid refresh token",
        });
      });
    });
  });
});
