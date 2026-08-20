import { ConflictError } from "@backend/error";
import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle/drizzleTransaction";
import { noopLogger } from "@backend/lib/logger";
import { noopTracer } from "@backend/lib/tracer";
import { testDB } from "@backend/test.setup";
import { refreshTokens, users } from "@infra/drizzle/schema";
import {
  createUserProviderEntity,
  createUserProviderId,
} from "@packages/domain/auth/userProviderSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { newUserConsentRepository } from "../../user/userConsentRepository";
import { newUserRepository } from "../../user/userRepository";
import { loginWithProvider } from "../authProviderUsecase";
import { newRefreshTokenRepository } from "../refreshTokenRepository";
import {
  type UserProviderRepository,
  newUserProviderRepository,
} from "../userProviderRepository";

const USER_ONE = createUserId("10000000-0000-4000-8000-000000000001");
const USER_TWO = createUserId("10000000-0000-4000-8000-000000000002");

async function insertUser(userId: string, loginId: string) {
  await testDB.insert(users).values({ id: userId, loginId, name: loginId });
}

function providerEntity(userId: typeof USER_ONE, id: string) {
  return createUserProviderEntity({
    id: createUserProviderId(id),
    userId,
    provider: "google",
    providerId: "provider-account",
    email: "oauth@example.com",
    type: "new",
  });
}

describe("OAuth provider PostgreSQL constraints", () => {
  it("maps active duplicate identity 23505 and permits reuse after soft delete", async () => {
    await insertUser(USER_ONE, "provider-winner");
    await insertUser(USER_TWO, "provider-successor");
    const repository = newUserProviderRepository(testDB);

    await repository.createUserProvider(
      providerEntity(USER_ONE, "20000000-0000-4000-8000-000000000001"),
    );
    await expect(
      repository.createUserProvider(
        providerEntity(USER_TWO, "20000000-0000-4000-8000-000000000002"),
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    await expect(
      repository.softDeleteUserProvider(USER_ONE, "google"),
    ).resolves.toBe(true);
    await expect(
      repository.createUserProvider(
        providerEntity(USER_TWO, "20000000-0000-4000-8000-000000000003"),
      ),
    ).resolves.toMatchObject({
      userId: USER_TWO,
      providerId: "provider-account",
    });
  });

  it("rolls back a losing registration and reloads the constraint winner", async () => {
    await insertUser(USER_ONE, "existing-winner");
    const realProviderRepo = newUserProviderRepository(testDB);
    await realProviderRepo.createUserProvider(
      providerEntity(USER_ONE, "20000000-0000-4000-8000-000000000011"),
    );

    let findCalls = 0;
    const racingProviderRepo: UserProviderRepository = {
      ...realProviderRepo,
      findUserProviderByIdAndProvider(provider, providerId) {
        findCalls += 1;
        if (findCalls === 1) return Promise.resolve(null);
        return realProviderRepo.findUserProviderByIdAndProvider(
          provider,
          providerId,
        );
      },
      withTx(tx) {
        return realProviderRepo.withTx(tx);
      },
    };
    const userRepo = newUserRepository(testDB);
    const refreshRepo = newRefreshTokenRepository(testDB, noopLogger);
    const action = loginWithProvider(
      userRepo,
      refreshRepo,
      racingProviderRepo,
      newUserConsentRepository(testDB),
      newDrizzleTransactionRunner(testDB),
      "integration-jwt-secret",
      "integration-audience",
      (() => {
        const verifier = async () => ({
          iss: "https://accounts.example.com",
          sub: "provider-account",
          aud: "client",
          exp: 2_000_000_000,
          iat: 1_900_000_000,
          email: "oauth@example.com",
        });
        return { google: verifier, apple: verifier };
      })(),
      noopTracer,
    );

    const output = await action("google", "credential", "client", {
      age: true,
      terms: "2026-07-13",
      privacy: "2026-07-13",
    });

    expect(output.userId).toBe(USER_ONE);
    await expect(
      userRepo.getUserByLoginId("google|provider-account"),
    ).resolves.toBeUndefined();
    const winnerTokens = await testDB
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, USER_ONE));
    expect(winnerTokens).toHaveLength(1);
  });
});
