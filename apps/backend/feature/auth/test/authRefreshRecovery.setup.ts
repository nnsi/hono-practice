import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle";
import { createAuthDiagnosticCollector } from "@backend/lib/authDiagnostics";
import { hashWithSHA256 } from "@backend/lib/hash";
import { noopLogger } from "@backend/lib/logger";
import { noopTracer } from "@backend/lib/tracer";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { refreshTokens } from "@infra/drizzle/schema";
import { createRefreshToken } from "@packages/domain/auth/refreshTokenSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { v7 } from "uuid";

import { newUserRepository } from "../../user/userRepository";
import { logout } from "../authLoginUsecase";
import { rotateRefreshToken } from "../authRefreshUsecase";
import { newRefreshTokenRepository } from "../refreshTokenRepository";

export async function recoveryFixture(
  expiresAt = new Date(Date.now() + 86_400_000),
) {
  await testDB.delete(refreshTokens);
  const collector = createAuthDiagnosticCollector({
    environment: "test",
    hasOrigin: false,
  });
  const repo = newRefreshTokenRepository(testDB, noopLogger, collector.observe);
  const userId = createUserId(TEST_USER_ID);
  const secret = v7();
  const parent = await repo.createRefreshToken(
    createRefreshToken({
      userId,
      selector: v7(),
      token: await hashWithSHA256(secret),
      expiresAt,
    }),
  );
  const createRotate = (repository = repo, jwtSecret = "test-secret") =>
    rotateRefreshToken(
      repository,
      newUserRepository(testDB),
      newDrizzleTransactionRunner(testDB),
      jwtSecret,
      "test-audience",
      noopTracer,
      collector.observe,
    );
  return {
    repo,
    parent,
    collector,
    userId,
    combined: `${parent.selector}.${secret}`,
    operation: crypto.randomUUID(),
    createRotate,
    rotate: createRotate(),
    logout: logout(repo, noopTracer, newDrizzleTransactionRunner(testDB)),
    rows: () => testDB.select().from(refreshTokens),
  };
}
