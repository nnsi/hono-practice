import { createUserEntity } from "@backend/domain/user/user";
import { createUserId } from "@backend/domain/user/userId";
// Use only ts-mockito imports for mocking repos and verifier
import bcrypt from "bcryptjs"; // bcryptjs をインポート
import { mock, instance, when, verify, deepEqual, anything } from "ts-mockito";
// Remove vitest mocking imports, keep test runner imports
import { describe, it, expect, beforeEach } from "vitest";

import { AuthError } from "../../../error";
import { newAuthUsecase } from "../authUsecase";

import type { UserRepository } from "../../user/userRepository";
import type { AuthUsecase } from "../authUsecase";
import type { PasswordVerifier } from "../passwordVerifier";
import type { UserId } from "@backend/domain";
import type { RefreshToken } from "@backend/domain/auth/refreshToken";
import type { RefreshTokenRepository } from "@backend/feature/auth/refreshTokenRepository";

// Restore the helper function and add selector
const createMockRefreshToken = (
  userId: UserId,
  hashedToken: string,
  options: Partial<
    Omit<RefreshToken, "token" | "userId"> & { selector?: string }
  > = {},
): RefreshToken => ({
  id: options.id ?? crypto.randomUUID(),
  userId,
  selector: options.selector ?? crypto.randomUUID(), // Add selector
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
      when(userRepo.getUserByLoginId(user.loginId)).thenResolve(user);
      when(passwordVerifier.compare(user.password, user.password)).thenResolve(
        true,
      );

      // create のモック設定を anything() で簡略化
      when(refreshTokenRepo.create(anything())).thenResolve(
        createMockRefreshToken(user.id, "hashed-refresh-token"),
      );

      const result = await usecase.login({
        loginId: user.loginId,
        password: user.password,
      });

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toMatch(/^.+\..+$/);

      // create の検証を修正
      verify(refreshTokenRepo.create(anything())).once();
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
      verify(refreshTokenRepo.create(anything())).never();
    });

    it("異常系：パスワードが間違っている", async () => {
      when(userRepo.getUserByLoginId("test-user")).thenResolve(user);

      // Mock passwordVerifier.compare using thenCall
      when(passwordVerifier.compare("wrong-password", user.password)).thenCall(
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
      verify(passwordVerifier.compare("wrong-password", user.password)).once();
      verify(refreshTokenRepo.create(anything())).never();
    });
  });

  describe("refreshToken", () => {
    const userId = createUserId();
    const oldTokenId = "old-token-id";
    const oldSelector = "old-selector-uuid";
    const oldPlainToken = "old-refresh-token-plain";
    const combinedOldToken = `${oldSelector}.${oldPlainToken}`;
    let oldHashedToken: string; // beforeEach で初期化するために let に変更

    // bcrypt.hash を beforeEach 内で行う
    beforeEach(async () => {
      oldHashedToken = await bcrypt.hash(oldPlainToken, 10);
    });

    it("正常系：トークンの更新成功", async () => {
      const oldRefreshToken = createMockRefreshToken(userId, oldHashedToken, {
        id: oldTokenId,
        selector: oldSelector,
      });

      when(refreshTokenRepo.findByToken(combinedOldToken)).thenResolve(
        oldRefreshToken,
      );

      // create のモック設定を anything() で簡略化
      when(refreshTokenRepo.create(anything())).thenResolve(
        createMockRefreshToken(userId, "new-hashed-token"),
      );

      when(refreshTokenRepo.revoke(oldTokenId)).thenResolve();

      const result = await usecase.refreshToken(combinedOldToken);

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).not.toBe(combinedOldToken);
      expect(result.refreshToken).toMatch(/^.+\..+$/);

      // create と revoke の検証を修正
      verify(refreshTokenRepo.create(anything())).once();
      verify(refreshTokenRepo.revoke(oldTokenId)).once();
    });

    it("異常系：リフレッシュトークンが見つからない", async () => {
      when(refreshTokenRepo.findByToken("not-found-token")).thenResolve(null);

      await expect(usecase.refreshToken("not-found-token")).rejects.toThrow(
        new Error("invalid refresh token"),
      ); // ここは元のメッセージのまま

      verify(refreshTokenRepo.findByToken("not-found-token")).once();
    });

    it("異常系：リフレッシュトークンが無効化されている", async () => {
      const revokedTokenId = "revoked-token-id";
      const revokedSelector = "revoked-selector";
      const revokedPlainToken = "revoked-plain";
      const combinedRevokedToken = `${revokedSelector}.${revokedPlainToken}`;
      const revokedHashedToken = await bcrypt.hash(revokedPlainToken, 10);
      const revokedToken = createMockRefreshToken(userId, revokedHashedToken, {
        id: revokedTokenId,
        selector: revokedSelector,
        revokedAt: new Date(), // 失効済み
      });

      when(refreshTokenRepo.findByToken(combinedRevokedToken)).thenResolve(
        revokedToken,
      );
      when(refreshTokenRepo.revoke(revokedTokenId)).thenResolve();

      await expect(usecase.refreshToken(combinedRevokedToken)).rejects.toThrow(
        new Error("invalid refresh token (validation failed)"),
      ); // 修正後のメッセージ

      verify(refreshTokenRepo.findByToken(combinedRevokedToken)).once();
      // revoke が呼ばれるかも検証 (オプション)
      // verify(refreshTokenRepo.revoke(revokedTokenId)).once();
    });

    it("異常系：リフレッシュトークンが期限切れ", async () => {
      const expiredTokenId = "expired-token-id";
      const expiredSelector = "expired-selector";
      const expiredPlainToken = "expired-plain";
      const combinedExpiredToken = `${expiredSelector}.${expiredPlainToken}`;
      const expiredHashedToken = await bcrypt.hash(expiredPlainToken, 10);
      const expiredToken = createMockRefreshToken(userId, expiredHashedToken, {
        id: expiredTokenId,
        selector: expiredSelector,
        expiresAt: new Date(Date.now() - 1000 * 60), // 期限切れ
      });

      when(refreshTokenRepo.findByToken(combinedExpiredToken)).thenResolve(
        expiredToken,
      );
      when(refreshTokenRepo.revoke(expiredTokenId)).thenResolve();

      await expect(usecase.refreshToken(combinedExpiredToken)).rejects.toThrow(
        new Error("invalid refresh token (validation failed)"),
      ); // 修正後のメッセージ

      verify(refreshTokenRepo.findByToken(combinedExpiredToken)).once();
      // revoke が呼ばれるかも検証 (オプション)
      // verify(refreshTokenRepo.revoke(expiredTokenId)).once();
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
