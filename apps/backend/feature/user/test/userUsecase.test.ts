import type { TransactionRunner } from "@backend/infra/rdb/db";
import { noopTracer } from "@backend/lib/tracer";
import {
  type Subscription,
  createSubscriptionId,
  newSubscription,
} from "@packages/domain/subscription/subscriptionSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import type { UserProviderRepository } from "../../auth/userProviderRepository";
import type { SubscriptionQueryUsecase } from "../../subscription/subscriptionUsecase";
import {
  type UserConsentRepository,
  type UserRepository,
  newUserUsecase,
} from "..";

describe("UserUsecase", () => {
  let repo: UserRepository;
  let providerRepo: UserProviderRepository;
  let userConsentRepo: UserConsentRepository;
  let txRunner: TransactionRunner;
  let subscriptionUc: SubscriptionQueryUsecase;
  let usecase: ReturnType<typeof newUserUsecase>;

  const userId = createUserId("00000000-0000-4000-8000-000000000000");

  const freeSubscription: Subscription = newSubscription({
    id: createSubscriptionId(),
    userId,
    plan: "free",
    status: "active",
    paymentProvider: null,
    paymentProviderId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    trialStart: null,
    trialEnd: null,
    priceAmount: null,
    priceCurrency: "JPY",
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    repo = mock<UserRepository>();
    providerRepo = mock<UserProviderRepository>();
    userConsentRepo = mock<UserConsentRepository>();
    subscriptionUc = mock<SubscriptionQueryUsecase>();
    txRunner = {
      async run(repositories, operation) {
        const merged = Object.assign({}, ...repositories);
        return operation(merged);
      },
    };
    usecase = newUserUsecase(
      instance(repo),
      instance(providerRepo),
      instance(userConsentRepo),
      txRunner,
      instance(subscriptionUc),
      noopTracer,
    );
    reset(repo);
    reset(providerRepo);
    reset(userConsentRepo);
    reset(subscriptionUc);
  });

  describe("getUserById", () => {
    it("free ユーザーの plan が返る", async () => {
      when(repo.getUserById(userId)).thenResolve({
        type: "persisted",
        id: userId,
        name: "test",
        loginId: "test",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      when(providerRepo.getUserProvidersByUserId(userId)).thenResolve([]);
      when(subscriptionUc.getSubscriptionByUserIdOrDefault(userId)).thenResolve(
        freeSubscription,
      );

      const result = await usecase.getUserById(userId);

      expect(result.plan).toBe("free");
      expect(result.providers).toEqual([]);
    });

    it("premium ユーザーの plan が返る", async () => {
      const premiumSub = newSubscription({
        ...freeSubscription,
        plan: "premium",
      });
      when(repo.getUserById(userId)).thenResolve({
        type: "persisted",
        id: userId,
        name: "test",
        loginId: "test",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      when(providerRepo.getUserProvidersByUserId(userId)).thenResolve([]);
      when(subscriptionUc.getSubscriptionByUserIdOrDefault(userId)).thenResolve(
        premiumSub,
      );

      const result = await usecase.getUserById(userId);

      expect(result.plan).toBe("premium");
    });

    it("ユーザーが存在しない場合 404 エラー", async () => {
      when(repo.getUserById(userId)).thenResolve(undefined);
      when(providerRepo.getUserProvidersByUserId(userId)).thenResolve([]);
      when(
        subscriptionUc.getSubscriptionByUserIdOrDefault(anything()),
      ).thenResolve(freeSubscription);

      await expect(usecase.getUserById(userId)).rejects.toThrow(
        "user not found",
      );
    });
  });

  describe("deleteUser", () => {
    it("正常系：ユーザー削除が成功する", async () => {
      when(repo.deleteUser(userId)).thenResolve();

      await usecase.deleteUser(userId);

      verify(repo.deleteUser(userId)).once();
    });

    it("異常系：リポジトリがエラーをスローする", async () => {
      when(repo.deleteUser(userId)).thenReject(new Error("db error"));

      await expect(usecase.deleteUser(userId)).rejects.toThrow("db error");
    });
  });
});
