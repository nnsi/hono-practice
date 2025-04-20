import { createUserEntity } from "@backend/domain/user/user";
import { createUserId } from "@backend/domain/user/userId";
import { hashWithSHA256 } from "@backend/lib/hash";
// Use only ts-mockito imports for mocking repos and verifier
import { mock, instance, when, verify, anything } from "ts-mockito";
// Remove vitest mocking imports, keep test runner imports
import { v7 } from "uuid";
import { describe, it, expect, beforeEach } from "vitest";

import { AuthError } from "../../../error";
import { newAuthUsecase } from "../authUsecase";

import type { UserRepository } from "../../user/userRepository";
import type { AuthUsecase } from "../authUsecase";
import type { OAuthVerify } from "../oauthVerify";
import type { PasswordVerifier } from "../passwordVerifier";
import type { UserId } from "@backend/domain";
import type { RefreshToken } from "@backend/domain/auth/refreshToken";
import type { RefreshTokenRepository } from "@backend/feature/auth/refreshTokenRepository";
import type { UserProviderRepository } from "@backend/feature/auth/userProviderRepository";

// Restore the helper function and add selector
const createMockRefreshToken = (
  userId: UserId,
  hashedToken: string,
  options: Partial<
    Omit<RefreshToken, "token" | "userId"> & { selector?: string }
  > = {},
): RefreshToken => ({
  id: options.id ?? v7(),
  userId,
  selector: options.selector ?? v7(), // Add selector
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
  let userProviderRepo: UserProviderRepository;
  let passwordVerifier: PasswordVerifier;
  let mockVerifier: OAuthVerify;
  const JWT_SECRET = "test-secret";

  beforeEach(() => {
    userRepo = mock<UserRepository>();
    refreshTokenRepo = mock<RefreshTokenRepository>();
    userProviderRepo = mock<UserProviderRepository>();
    passwordVerifier = mock<PasswordVerifier>();
    mockVerifier = mock<OAuthVerify>();
    usecase = newAuthUsecase(
      instance(userRepo),
      instance(refreshTokenRepo),
      instance(userProviderRepo),
      instance(passwordVerifier),
      JWT_SECRET,
      { google: mockVerifier },
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
      when(userRepo.getUserByLoginId(user.loginId)).thenResolve(user);
      when(
        passwordVerifier.compare(user.password!, user.password!),
      ).thenResolve(true);

      // create のモック設定を anything() で簡略化
      when(refreshTokenRepo.createRefreshToken(anything())).thenResolve(
        createMockRefreshToken(user.id, "hashed-refresh-token"),
      );

      const result = await usecase.login({
        loginId: user.loginId,
        password: user.password!,
      });

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toMatch(/^.+\..+$/);

      // create の検証を修正
      verify(refreshTokenRepo.createRefreshToken(anything())).once();
    });

    it("異常系：ユーザーが見つからない", async () => {
      when(userRepo.getUserByLoginId("non-existent-user")).thenResolve(
        undefined,
      );
      await expect(
        usecase.login({
          loginId: "non-existent-user",
          password: "password123",
        }),
      ).rejects.toThrow(new AuthError("invalid credentials"));
      // Verify password verifier was not called
      verify(passwordVerifier.compare(anything(), anything())).never();
      verify(refreshTokenRepo.createRefreshToken(anything())).never();
    });

    it("異常系：パスワードが間違っている", async () => {
      when(userRepo.getUserByLoginId("test-user")).thenResolve(user);

      // Mock passwordVerifier.compare using thenCall
      when(passwordVerifier.compare("wrong-password", user.password!)).thenCall(
        async () => false,
      );

      await expect(
        usecase.login({
          loginId: "test-user",
          password: "wrong-password",
        }),
      ).rejects.toThrow(new AuthError("invalid credentials"));

      verify(userRepo.getUserByLoginId("test-user")).once();
      // Verify the mocked passwordVerifier was called
      verify(passwordVerifier.compare("wrong-password", user.password!)).once();
      verify(refreshTokenRepo.createRefreshToken(anything())).never();
    });
  });

  describe("refreshToken", () => {
    let oldPlainToken: string;
    let oldHashedToken: string;
    let oldSelector: string;
    let oldTokenId: string;
    let userId: UserId;

    beforeEach(async () => {
      oldPlainToken = v7();
      oldSelector = v7();
      oldTokenId = v7();
      userId = createUserId();
      oldHashedToken = await hashWithSHA256(oldPlainToken);
    });

    it("正常系：リフレッシュトークンの更新成功", async () => {
      const oldToken = createMockRefreshToken(userId, oldHashedToken, {
        id: oldTokenId,
        selector: oldSelector,
      });

      when(
        refreshTokenRepo.getRefreshTokenByToken(
          `${oldSelector}.${oldPlainToken}`,
        ),
      ).thenResolve(oldToken);

      when(refreshTokenRepo.createRefreshToken(anything())).thenCall(
        async (input: { userId: UserId; token: string }) =>
          createMockRefreshToken(
            input.userId,
            await hashWithSHA256(input.token),
          ),
      );

      const result = await usecase.refreshToken(
        `${oldSelector}.${oldPlainToken}`,
      );

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));

      verify(refreshTokenRepo.revokeRefreshToken(oldTokenId)).once();
    });

    it("異常系：無効なリフレッシュトークン", async () => {
      when(refreshTokenRepo.getRefreshTokenByToken(anything())).thenResolve(
        null,
      );

      await expect(usecase.refreshToken("invalid-token")).rejects.toThrow(
        new AuthError("invalid refresh token"),
      );

      verify(refreshTokenRepo.createRefreshToken(anything())).never();
    });

    it("異常系：失効したリフレッシュトークン", async () => {
      const revokedPlainToken = v7();
      const revokedSelector = v7();
      const revokedHashedToken = await hashWithSHA256(revokedPlainToken);
      const revokedToken = createMockRefreshToken(userId, revokedHashedToken, {
        selector: revokedSelector,
        revokedAt: new Date(),
      });

      when(
        refreshTokenRepo.getRefreshTokenByToken(
          `${revokedSelector}.${revokedPlainToken}`,
        ),
      ).thenResolve(revokedToken);

      await expect(
        usecase.refreshToken(`${revokedSelector}.${revokedPlainToken}`),
      ).rejects.toThrow(
        new AuthError("invalid refresh token (validation failed)"),
      );

      verify(refreshTokenRepo.createRefreshToken(anything())).never();
    });

    it("異常系：期限切れのリフレッシュトークン", async () => {
      const expiredPlainToken = v7();
      const expiredSelector = v7();
      const expiredHashedToken = await hashWithSHA256(expiredPlainToken);
      const expiredToken = createMockRefreshToken(userId, expiredHashedToken, {
        selector: expiredSelector,
        expiresAt: new Date(Date.now() - 1000), // 期限切れ
      });

      when(
        refreshTokenRepo.getRefreshTokenByToken(
          `${expiredSelector}.${expiredPlainToken}`,
        ),
      ).thenResolve(expiredToken);

      await expect(
        usecase.refreshToken(`${expiredSelector}.${expiredPlainToken}`),
      ).rejects.toThrow(
        new AuthError("invalid refresh token (validation failed)"),
      );

      verify(refreshTokenRepo.createRefreshToken(anything())).never();
    });
  });

  describe("logout", () => {
    const userId = createUserId();
    const refreshToken = "selector.token";
    const storedToken = createMockRefreshToken(userId, "hashedToken");

    it("正常系：ログアウト成功", async () => {
      when(refreshTokenRepo.getRefreshTokenByToken(refreshToken)).thenResolve(
        storedToken,
      );
      when(refreshTokenRepo.revokeRefreshToken(storedToken.id)).thenResolve();

      await expect(usecase.logout(userId, refreshToken)).resolves.not.toThrow();

      verify(refreshTokenRepo.getRefreshTokenByToken(refreshToken)).once();
      verify(refreshTokenRepo.revokeRefreshToken(storedToken.id)).once();
    });

    it("異常系：存在しないリフレッシュトークン", async () => {
      when(refreshTokenRepo.getRefreshTokenByToken(refreshToken)).thenResolve(
        null,
      );

      await expect(usecase.logout(userId, refreshToken)).rejects.toThrow(
        "invalid refresh token",
      );

      verify(refreshTokenRepo.getRefreshTokenByToken(refreshToken)).once();
      verify(refreshTokenRepo.revokeRefreshToken(anything())).never();
    });

    it("異常系：他のユーザーのリフレッシュトークン", async () => {
      const otherUserId = createUserId();
      const otherUserToken = createMockRefreshToken(otherUserId, "hashedToken");
      when(refreshTokenRepo.getRefreshTokenByToken(refreshToken)).thenResolve(
        otherUserToken,
      );

      await expect(usecase.logout(userId, refreshToken)).rejects.toThrow(
        "unauthorized - token does not belong to user",
      );

      verify(refreshTokenRepo.getRefreshTokenByToken(refreshToken)).once();
      verify(refreshTokenRepo.revokeRefreshToken(anything())).never();
    });

    it("異常系：データベースエラー", async () => {
      when(refreshTokenRepo.getRefreshTokenByToken(refreshToken)).thenResolve(
        storedToken,
      );
      when(refreshTokenRepo.revokeRefreshToken(storedToken.id)).thenReject(
        new Error("Database error"),
      );

      await expect(usecase.logout(userId, refreshToken)).rejects.toThrow(
        "Database error",
      );

      verify(refreshTokenRepo.getRefreshTokenByToken(refreshToken)).once();
      verify(refreshTokenRepo.revokeRefreshToken(storedToken.id)).once();
    });
  });
});
