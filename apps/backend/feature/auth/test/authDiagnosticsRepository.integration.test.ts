import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle";
import { createAuthDiagnosticCollector } from "@backend/lib/authDiagnostics";
import { hashWithSHA256 } from "@backend/lib/hash";
import { noopLogger } from "@backend/lib/logger";
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

describe("refresh diagnostics preserve credential decisions", () => {
  const createCollector = () =>
    createAuthDiagnosticCollector({ environment: "test", hasOrigin: false });
  let diagnostics = createCollector();
  let repo: RefreshTokenRepository;
  let token: RefreshToken;
  let combined: string;

  beforeEach(async () => {
    await testDB.delete(refreshTokens);
    diagnostics = createCollector();
    repo = newRefreshTokenRepository(testDB, noopLogger, diagnostics.observe);
    const plain = v7();
    token = await repo.createRefreshToken(
      createRefreshToken({
        userId: createUserId(TEST_USER_ID),
        selector: v7(),
        token: await hashWithSHA256(plain),
        expiresAt: new Date(Date.now() + 60_000),
      }),
    );
    combined = `${token.selector}.${plain}`;
  });

  const rotate = (
    repository = repo,
    userRepo: UserRepository = newUserRepository(testDB),
  ) =>
    rotateRefreshToken(
      repository,
      userRepo,
      newDrizzleTransactionRunner(testDB),
      "test-secret",
      "test-audience",
      noopTracer,
      diagnostics.observe,
    );

  it.each([
    "malformed",
    "not_found",
    "hash_mismatch",
  ] as const)("reports %s without consuming a valid token", async (reason) => {
    const input =
      reason === "malformed"
        ? "invalid"
        : reason === "not_found"
          ? `${v7()}.${v7()}`
          : `${token.selector}.${v7()}`;
    await expect(rotate()(input)).rejects.toThrow("invalid refresh token");
    expect(diagnostics.snapshot()).toMatchObject({
      reason,
      stage: "rotation",
      rotationCommitted: false,
    });
    expect(await repo.getRefreshTokenByToken(combined)).not.toBeNull();
    const serialized = JSON.stringify(diagnostics.snapshot());
    expect(serialized).not.toContain(token.selector);
    expect(serialized).not.toContain(token.token);
    expect(serialized).not.toContain(TEST_USER_ID);
  });

  it.each([
    "revoked",
    "deleted",
    "expired",
    "grace_expired",
  ] as const)("reports %s while retaining the generic 401 decision", async (reason) => {
    const past = new Date(Date.now() - 60_000);
    await testDB
      .update(refreshTokens)
      .set({
        ...(reason === "revoked" ? { revokedAt: past } : {}),
        ...(reason === "deleted" ? { deletedAt: past } : {}),
        ...(reason === "expired" ? { expiresAt: past } : {}),
        ...(reason === "grace_expired" ? { rotatedAt: past } : {}),
      })
      .where(eq(refreshTokens.id, token.id));
    await expect(rotate()(combined)).rejects.toThrow("invalid refresh token");
    expect(diagnostics.snapshot()).toMatchObject({
      reason,
      stage: "rotation",
      rotationCommitted: false,
    });
  });

  it("distinguishes committed rotation, one-time grace, and subsequent revocation", async () => {
    await rotate()(combined);
    expect(diagnostics.snapshot()).toMatchObject({
      reason: "rotated",
      rotationCommitted: true,
    });
    await rotate()(combined);
    expect(diagnostics.snapshot()).toMatchObject({
      reason: "grace_used",
      rotationCommitted: true,
    });
    await expect(rotate()(combined)).rejects.toThrow("invalid refresh token");
    expect(diagnostics.snapshot()).toMatchObject({
      reason: "revoked",
      rotationCommitted: false,
    });
  });

  it("reports concurrent rejection without allowing extra grace consumption", async () => {
    const attempts = Array.from({ length: 5 }, () => {
      const collector = createCollector();
      const repository = newRefreshTokenRepository(
        testDB,
        noopLogger,
        collector.observe,
      );
      return {
        collector,
        result: repository.revokeAndGetRefreshToken(combined),
      };
    });
    const results = await Promise.all(
      attempts.map((attempt) => attempt.result),
    );
    expect(results.filter(Boolean)).toHaveLength(2);
    const reasons = attempts.map(
      ({ collector }) => collector.snapshot().reason,
    );
    expect(reasons.filter((reason) => reason === "rotated")).toHaveLength(1);
    expect(reasons.filter((reason) => reason === "grace_used")).toHaveLength(1);
    expect(
      reasons.filter(
        (reason) => reason === "race_lost" || reason === "revoked",
      ),
    ).toHaveLength(3);
  });

  it("marks persistence failure unconfirmed and leaves the old credential usable", async () => {
    const failing: RefreshTokenRepository = {
      ...repo,
      withTx: (tx) => {
        const transactional = repo.withTx(tx);
        return {
          ...transactional,
          createRefreshToken: (next) =>
            transactional.createRefreshToken({
              ...next,
              selector: token.selector,
            }),
        };
      },
    };
    await expect(rotate(failing)(combined)).rejects.toThrow();
    expect(diagnostics.snapshot()).toMatchObject({
      reason: "rotation_failed",
      stage: "token_persist",
      rotationCommitted: false,
    });
    expect(await repo.getRefreshTokenByToken(combined)).not.toBeNull();
  });

  it("reports missing user without exposing it to the caller or committing rotation", async () => {
    const userRepo = newUserRepository(testDB);
    const missingUser: UserRepository = {
      ...userRepo,
      withTx: (tx) => ({
        ...userRepo.withTx(tx),
        getUserById: async () => undefined,
      }),
    };
    await expect(rotate(repo, missingUser)(combined)).rejects.toThrow(
      "invalid refresh token",
    );
    expect(diagnostics.snapshot()).toMatchObject({
      reason: "user_not_found",
      stage: "user_lookup",
      rotationCommitted: false,
    });
    expect(await repo.getRefreshTokenByToken(combined)).not.toBeNull();
  });

  it("a throwing observer does not break successful authentication or invalidation", async () => {
    const throwingObserver = () => {
      throw new Error("diagnostic sink failed");
    };
    const repository = newRefreshTokenRepository(
      testDB,
      noopLogger,
      throwingObserver,
    );
    const perform = rotateRefreshToken(
      repository,
      newUserRepository(testDB),
      newDrizzleTransactionRunner(testDB),
      "test-secret",
      "test-audience",
      noopTracer,
      throwingObserver,
    );
    await expect(perform(combined)).resolves.toMatchObject({
      userId: TEST_USER_ID,
    });
    await expect(perform("malformed")).rejects.toThrow("invalid refresh token");
  });
});
