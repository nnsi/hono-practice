import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle";
import { hashWithSHA256 } from "@backend/lib/hash";
import { noopTracer } from "@backend/lib/tracer";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { refreshTokens } from "@infra/drizzle/schema";
import {
  type RefreshToken,
  createRefreshToken,
} from "@packages/domain/auth/refreshTokenSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { eq } from "drizzle-orm";
import { v7 } from "uuid";
import { beforeEach, describe, expect, it } from "vitest";

import {
  type UserRepository,
  newUserRepository,
} from "../../user/userRepository";
import { rotateRefreshToken } from "../authLoginUsecase";
import {
  type RefreshTokenRepository,
  newRefreshTokenRepository,
} from "../refreshTokenRepository";

describe("refresh token rotation transaction", () => {
  let repository: RefreshTokenRepository;
  let originalToken: RefreshToken;
  let combinedToken: string;

  const createRotate = (
    refreshTokenRepo = repository,
    userRepo: UserRepository = newUserRepository(testDB),
  ) =>
    rotateRefreshToken(
      refreshTokenRepo,
      userRepo,
      newDrizzleTransactionRunner(testDB),
      "test-secret",
      "test-audience",
      noopTracer,
    );

  const getOriginalRow = async () => {
    const [row] = await testDB
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, originalToken.id));
    return row;
  };

  // 実際の INSERT を一意制約違反で失敗させ、PGlite の rollback を検証する。
  const withFailingInsert = (): RefreshTokenRepository => ({
    ...repository,
    withTx: (tx) => {
      const txRepository = repository.withTx(tx);
      return {
        ...txRepository,
        createRefreshToken: (token) =>
          txRepository.createRefreshToken({
            ...token,
            selector: originalToken.selector,
          }),
      };
    },
  });

  beforeEach(async () => {
    await testDB.delete(refreshTokens);
    repository = newRefreshTokenRepository(testDB);
    const plainToken = v7();
    originalToken = await repository.createRefreshToken(
      createRefreshToken({
        userId: createUserId(TEST_USER_ID),
        selector: v7(),
        token: await hashWithSHA256(plainToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
    );
    combinedToken = `${originalToken.selector}.${plainToken}`;
  });

  it("新 token の保存失敗では初回 rotation を取り消し、同じ token で再試行できる", async () => {
    await expect(
      createRotate(withFailingInsert())(combinedToken),
    ).rejects.toThrow();

    expect(await getOriginalRow()).toMatchObject({
      rotatedAt: null,
      revokedAt: null,
    });
    expect(await testDB.select().from(refreshTokens)).toHaveLength(1);

    const result = await createRotate()(combinedToken);
    expect(result.refreshToken).not.toBe(combinedToken);
    expect(
      await repository.getRefreshTokenByToken(result.refreshToken),
    ).not.toBeNull();
    expect((await getOriginalRow()).rotatedAt).not.toBeNull();
  });

  it("新 token の保存失敗では grace の消費も取り消し、救済を再試行できる", async () => {
    const rotate = createRotate();
    await rotate(combinedToken);
    const rotatedRow = await getOriginalRow();

    await expect(
      createRotate(withFailingInsert())(combinedToken),
    ).rejects.toThrow();

    expect(await getOriginalRow()).toMatchObject({
      rotatedAt: rotatedRow.rotatedAt,
      revokedAt: null,
    });
    expect(await testDB.select().from(refreshTokens)).toHaveLength(2);

    const result = await rotate(combinedToken);
    expect(
      await repository.getRefreshTokenByToken(result.refreshToken),
    ).not.toBeNull();
    expect((await getOriginalRow()).revokedAt).not.toBeNull();
    await expect(rotate(combinedToken)).rejects.toThrow(
      "invalid refresh token",
    );
  });

  it("ユーザー取得の一時障害でも旧 token を消費しない", async () => {
    const userRepo = newUserRepository(testDB);
    const failingUserRepo: UserRepository = {
      ...userRepo,
      withTx: (tx) => ({
        ...userRepo.withTx(tx),
        getUserById: async () => {
          throw new Error("temporary user lookup failure");
        },
      }),
    };

    await expect(
      createRotate(repository, failingUserRepo)(combinedToken),
    ).rejects.toThrow("temporary user lookup failure");
    expect(await getOriginalRow()).toMatchObject({
      rotatedAt: null,
      revokedAt: null,
    });
    await expect(createRotate()(combinedToken)).resolves.toMatchObject({
      userId: TEST_USER_ID,
    });
  });
});
