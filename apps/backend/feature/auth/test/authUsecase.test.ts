import { createUserEntity } from "@backend/domain/user/user";
import { createUserId } from "@backend/domain/user/userId";
// Use only ts-mockito imports for mocking repos and verifier
import { mock, instance, when, verify, deepEqual, anything } from "ts-mockito";
// Remove vitest mocking imports, keep test runner imports
import { describe, it, expect, beforeEach } from "vitest";

import { AuthError } from "../../../error";
import { newAuthUsecase } from "../authUsecase";

import type { RefreshTokenRepository } from "../../../infra/repository/refreshTokenRepository";
import type { UserRepository } from "../../user/userRepository";
import type { AuthUsecase } from "../authUsecase";
import type { PasswordVerifier } from "../passwordVerifier";
import type { RefreshToken } from "@backend/domain/auth/refreshToken";

// Restore the helper function
const createMockRefreshToken = (
  userId: string,
  hashedToken: string,
  options: Partial<Omit<RefreshToken, "token">> = {},
): RefreshToken => ({
  id: options.id ?? crypto.randomUUID(),
  userId,
  token: hashedToken,
  expiresAt:
    options.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  revokedAt: options.revokedAt ?? null,
  createdAt: options.createdAt ?? new Date(),
  updatedAt: options.updatedAt ?? new Date(),
  deletedAt: options.deletedAt ?? null,
});

describe("AuthUsecase", () => {
  let usecase: AuthUsecase;
  let userRepo: UserRepository;
  let refreshTokenRepo: RefreshTokenRepository;
  let passwordVerifier: PasswordVerifier; // Declare mock variable
  const JWT_SECRET = "test-secret";

  beforeEach(() => {
    // Setup ts-mockito mocks including PasswordVerifier
    userRepo = mock<UserRepository>();
    refreshTokenRepo = mock<RefreshTokenRepository>();
    passwordVerifier = mock<PasswordVerifier>(); // Create mock
    usecase = newAuthUsecase(
      instance(userRepo),
      instance(refreshTokenRepo),
      instance(passwordVerifier), // Inject mock instance
      JWT_SECRET,
    );
  });

  describe("login", () => {
    const userId = createUserId();
    const user = createUserEntity({
      id: userId,
      loginId: "test-user",
      password: "$2a$10$dummypasshash",
      name: null,
      type: "persisted",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it("正常系：ログイン成功", async () => {
      const hashedRefreshToken = "hashed-refresh-token-value";

      when(userRepo.getUserByLoginId("test-user")).thenResolve(user);

      // Mock passwordVerifier.compare using thenCall
      when(passwordVerifier.compare("password123", user.password)).thenCall(
        async () => true,
      );

      when(
        refreshTokenRepo.create(
          deepEqual({
            userId: userId,
            token: anything(),
            expiresAt: anything(),
          }),
        ),
      ).thenCall(async (input) => {
        // Use the restored helper function
        return createMockRefreshToken(input.userId, hashedRefreshToken, {
          expiresAt: input.expiresAt,
        });
      });

      const result = await usecase.login("test-user", "password123");

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      verify(userRepo.getUserByLoginId("test-user")).once();
      // Verify the mocked passwordVerifier was called
      verify(passwordVerifier.compare("password123", user.password)).once();
      verify(
        refreshTokenRepo.create(
          deepEqual({
            userId: userId,
            token: result.refreshToken,
            expiresAt: anything(),
          }),
        ),
      ).once();
    });

    it("異常系：ユーザーが見つからない", async () => {
      when(userRepo.getUserByLoginId("non-existent-user")).thenResolve(
        undefined,
      );
      await expect(
        usecase.login("non-existent-user", "password123"),
      ).rejects.toThrow(new AuthError("invalid credentials"));
      // Verify password verifier was not called
      verify(passwordVerifier.compare(anything(), anything())).never();
      verify(refreshTokenRepo.create(anything())).never();
    });

    it("異常系：パスワードが間違っている", async () => {
      when(userRepo.getUserByLoginId("test-user")).thenResolve(user);

      // Mock passwordVerifier.compare using thenCall
      when(passwordVerifier.compare("wrong-password", user.password)).thenCall(
        async () => false,
      );

      await expect(
        usecase.login("test-user", "wrong-password"),
      ).rejects.toThrow(new AuthError("invalid credentials"));

      verify(userRepo.getUserByLoginId("test-user")).once();
      // Verify the mocked passwordVerifier was called
      verify(passwordVerifier.compare("wrong-password", user.password)).once();
      verify(refreshTokenRepo.create(anything())).never();
    });
  });

  describe("refreshToken", () => {
    const oldPlainToken = "valid-refresh-token";
    const oldHashedToken = "hashed-valid-refresh-token";
    const newHashedToken = "new-hashed-refresh-token";
    const userId = createUserId();
    const oldTokenId = "old-token-id";

    const validStoredToken = createMockRefreshToken(userId, oldHashedToken, {
      id: oldTokenId,
    });

    it("正常系：トークンの更新成功", async () => {
      when(refreshTokenRepo.findByToken(oldPlainToken)).thenResolve(
        validStoredToken,
      );
      when(
        refreshTokenRepo.create(
          deepEqual({
            userId: userId,
            token: anything(),
            expiresAt: anything(),
          }),
        ),
      ).thenCall(async (input) =>
        createMockRefreshToken(input.userId, newHashedToken, {
          expiresAt: input.expiresAt,
          id: "new-token-id",
        }),
      );
      when(refreshTokenRepo.revoke(oldTokenId)).thenResolve();

      const result = await usecase.refreshToken(oldPlainToken);

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.refreshToken).not.toBe(oldPlainToken);

      verify(refreshTokenRepo.findByToken(oldPlainToken)).once();
      verify(
        refreshTokenRepo.create(
          deepEqual({
            userId: userId,
            token: result.refreshToken,
            expiresAt: anything(),
          }),
        ),
      ).once();
      verify(refreshTokenRepo.revoke(oldTokenId)).once();
    });

    it("異常系：リフレッシュトークンが見つからない", async () => {
      when(refreshTokenRepo.findByToken("invalid-refresh-token")).thenResolve(
        null,
      );
      await expect(
        usecase.refreshToken("invalid-refresh-token"),
      ).rejects.toThrow(new AuthError("invalid refresh token"));
      verify(refreshTokenRepo.create(anything())).never();
      verify(refreshTokenRepo.revoke(anything())).never();
    });

    it("異常系：リフレッシュトークンが無効化されている", async () => {
      const revokedTokenId = "revoked-token-id";
      const revokedUserId = createUserId();
      const revokedStoredToken = createMockRefreshToken(
        revokedUserId,
        "hashed-revoked",
        { id: revokedTokenId, revokedAt: new Date() },
      );
      when(refreshTokenRepo.findByToken("revoked-refresh-token")).thenResolve(
        revokedStoredToken,
      );
      when(refreshTokenRepo.revoke(revokedTokenId)).thenResolve();

      await expect(
        usecase.refreshToken("revoked-refresh-token"),
      ).rejects.toThrow(new AuthError("invalid refresh token"));

      verify(refreshTokenRepo.findByToken("revoked-refresh-token")).once();
      verify(refreshTokenRepo.revoke(revokedTokenId)).once();
      verify(refreshTokenRepo.create(anything())).never();
    });

    it("異常系：リフレッシュトークンが期限切れ", async () => {
      const expiredTokenId = "expired-token-id";
      const expiredUserId = createUserId();
      const expiredStoredToken = createMockRefreshToken(
        expiredUserId,
        "hashed-expired",
        { id: expiredTokenId, expiresAt: new Date(Date.now() - 1000) },
      );
      when(refreshTokenRepo.findByToken("expired-refresh-token")).thenResolve(
        expiredStoredToken,
      );
      when(refreshTokenRepo.revoke(expiredTokenId)).thenResolve();

      await expect(
        usecase.refreshToken("expired-refresh-token"),
      ).rejects.toThrow(new AuthError("invalid refresh token"));

      verify(refreshTokenRepo.findByToken("expired-refresh-token")).once();
      verify(refreshTokenRepo.revoke(expiredTokenId)).once();
      verify(refreshTokenRepo.create(anything())).never();
    });
  });

  describe("logout", () => {
    const userId = createUserId();

    it("正常系：ログアウト成功", async () => {
      when(refreshTokenRepo.revokeAllByUserId(userId)).thenResolve();

      await expect(usecase.logout(userId)).resolves.not.toThrow();

      verify(refreshTokenRepo.revokeAllByUserId(userId)).once();
    });

    it("異常系：データベースエラー", async () => {
      when(refreshTokenRepo.revokeAllByUserId(userId)).thenReject(
        new Error("Database error"),
      );

      await expect(usecase.logout(userId)).rejects.toThrow("Database error");

      verify(refreshTokenRepo.revokeAllByUserId(userId)).once();
    });
  });
});
