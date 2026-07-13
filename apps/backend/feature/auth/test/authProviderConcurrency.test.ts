import { ConflictError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import { noopTracer } from "@backend/lib/tracer";
import {
  type UserProvider,
  createUserProviderEntity,
  createUserProviderId,
} from "@packages/domain/auth/userProviderSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { describe, expect, it, vi } from "vitest";

import type { UserConsentRepository, UserRepository } from "../../user";
import { linkProvider, loginWithProvider } from "../authProviderUsecase";
import type { RefreshTokenRepository } from "../refreshTokenRepository";
import type { UserProviderRepository } from "../userProviderRepository";

describe("OAuth identity concurrency", () => {
  it("parallel provider logins converge on one identity", async () => {
    let linked: UserProvider | null = null;
    let initialFinds = 0;
    let releaseFinds: (() => void) | undefined;
    const bothInitialFinds = new Promise<void>((resolve) => {
      releaseFinds = resolve;
    });
    const providerRepo = {
      async findUserProviderByIdAndProvider() {
        initialFinds++;
        if (initialFinds === 2) releaseFinds?.();
        await bothInitialFinds;
        return linked;
      },
      async createUserProvider(provider: UserProvider) {
        if (linked) throw new ConflictError("duplicate identity");
        linked = provider;
        return provider;
      },
      withTx() {
        return this;
      },
    } as unknown as UserProviderRepository;
    const userRepo = {
      createUser: vi.fn(async (user) => user),
      withTx() {
        return this;
      },
    } as unknown as UserRepository;
    const consentRepo = {
      createUserConsents: vi.fn(async (consents) => consents),
      withTx() {
        return this;
      },
    } as unknown as UserConsentRepository;
    const refreshRepo = {
      createRefreshToken: vi.fn(async (token) => token),
    } as unknown as RefreshTokenRepository;
    const txRunner = {
      async run(repositories: object[], operation: (repo: never) => unknown) {
        return operation(Object.assign({}, ...repositories) as never);
      },
    } as unknown as TransactionRunner;
    const verifier = async () => ({
      iss: "https://accounts.example.com",
      sub: "provider-account",
      aud: "client",
      exp: 2_000_000_000,
      iat: 1_900_000_000,
      email: "oauth@example.com",
    });
    const action = loginWithProvider(
      userRepo,
      refreshRepo,
      providerRepo,
      consentRepo,
      txRunner,
      "jwt-secret",
      "audience",
      { google: verifier, apple: verifier },
      noopTracer,
    );

    const [first, second] = await Promise.all([
      action("google", "token", "client", {
        age: true,
        terms: "2026-07-13",
        privacy: "2026-07-13",
      }),
      action("google", "token", "client", {
        age: true,
        terms: "2026-07-13",
        privacy: "2026-07-13",
      }),
    ]);

    expect(first.userId).toBe(second.userId);
    expect(linked).toMatchObject({ providerId: "provider-account" });
  });

  it("parallel link calls are idempotent for the same user", async () => {
    const userId = createUserId("00000000-0000-4000-8000-000000000000");
    let linked: UserProvider | null = null;
    let findCalls = 0;
    let releaseFinds: (() => void) | undefined;
    const bothFinds = new Promise<void>((resolve) => {
      releaseFinds = resolve;
    });
    const repo: UserProviderRepository = {
      async findUserProviderByIdAndProvider() {
        findCalls++;
        if (findCalls === 2) releaseFinds?.();
        await bothFinds;
        return linked;
      },
      async createUserProvider(provider) {
        if (linked) throw new ConflictError("duplicate identity");
        linked = provider;
        return provider;
      },
      getUserProvidersByUserId: vi.fn(),
      softDeleteUserProvider: vi.fn(),
      hardDeleteUserProvidersByUserId: vi.fn(),
      withTx() {
        return this;
      },
    };
    const verifier = async () => ({
      iss: "https://accounts.example.com",
      sub: "provider-account",
      aud: "client",
      exp: 2_000_000_000,
      iat: 1_900_000_000,
      email: "oauth@example.com",
    });
    const action = linkProvider(
      repo,
      { google: verifier, apple: verifier },
      noopTracer,
    );

    await expect(
      Promise.all([
        action(userId, "google", "token", "client"),
        action(userId, "google", "token", "client"),
      ]),
    ).resolves.toEqual([undefined, undefined]);
    expect(linked).toMatchObject({ userId, providerId: "provider-account" });
  });

  it("linking an already-associated identity is a no-op", async () => {
    const userId = createUserId("00000000-0000-4000-8000-000000000000");
    const existing = createUserProviderEntity({
      id: createUserProviderId("00000000-0000-4000-8000-000000000001"),
      userId,
      provider: "google",
      providerId: "provider-account",
      type: "persisted",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const create = vi.fn();
    const repo = {
      findUserProviderByIdAndProvider: vi.fn().mockResolvedValue(existing),
      createUserProvider: create,
    } as unknown as UserProviderRepository;
    const verifier = async () => ({
      iss: "https://accounts.example.com",
      sub: "provider-account",
      aud: "client",
      exp: 2_000_000_000,
      iat: 1_900_000_000,
      email: "oauth@example.com",
    });
    const action = linkProvider(
      repo,
      { google: verifier, apple: verifier },
      noopTracer,
    );

    await expect(
      action(userId, "google", "token", "client"),
    ).resolves.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });
});
