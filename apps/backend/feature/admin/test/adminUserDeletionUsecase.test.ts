import { AppError } from "@backend/error";
import { anything, deepEqual, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import type { newAdminUserDeletionUsecase } from "../adminUserDeletionUsecase";
import {
  type Mocks,
  createMocks,
  createUsecase,
  mockUser,
  resetMocks,
  setupDefaultStubs,
  testAdminEmail,
  testLoginId,
  testUserId,
} from "./adminUserDeletionUsecase.setup";

describe("AdminUserDeletionUsecase", () => {
  let mocks: Mocks;
  let usecase: ReturnType<typeof newAdminUserDeletionUsecase>;

  beforeEach(() => {
    mocks = createMocks();
    usecase = createUsecase(mocks);
    resetMocks(mocks);
    setupDefaultStubs(mocks);
  });

  it("user が存在しない場合は AppError(404) をスローする", async () => {
    when(mocks.userRepo.getUserById(anything())).thenResolve(undefined);

    await expect(
      usecase.deleteUserPermanently(testUserId, testLoginId, testAdminEmail),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("loginId 不一致の場合は AppError(400) をスローする", async () => {
    when(mocks.userRepo.getUserById(anything())).thenResolve(mockUser);

    await expect(
      usecase.deleteUserPermanently(
        testUserId,
        "wrong@example.com",
        testAdminEmail,
      ),
    ).rejects.toThrow(AppError);
    await expect(
      usecase.deleteUserPermanently(
        testUserId,
        "wrong@example.com",
        testAdminEmail,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("正常系: 全テーブルの削除件数が deletionCounts に返る", async () => {
    when(mocks.userRepo.getUserById(anything())).thenResolve(mockUser);
    when(
      mocks.freezePeriodRepo.hardDeleteGoalFreezePeriodsByUserId(anything()),
    ).thenResolve(6);
    when(
      mocks.activityLogRepo.hardDeleteActivityLogsByUserId(anything()),
    ).thenResolve(4);
    when(
      mocks.activityRepo.hardDeleteActivityKindsByUserId(anything()),
    ).thenResolve(3);
    when(
      mocks.activityGoalRepo.hardDeleteActivityGoalsByUserId(anything()),
    ).thenResolve(5);
    when(mocks.taskRepo.hardDeleteTasksByUserId(anything())).thenResolve(7);
    when(
      mocks.activityRepo.hardDeleteActivitiesByUserId(anything()),
    ).thenResolve(2);
    when(mocks.apiKeyRepo.hardDeleteApiKeysByUserId(anything())).thenResolve(8);
    when(
      mocks.refreshTokenRepo.hardDeleteRefreshTokensByUserId(anything()),
    ).thenResolve(9);
    when(
      mocks.userProviderRepo.hardDeleteUserProvidersByUserId(anything()),
    ).thenResolve(10);
    when(mocks.contactRepo.hardDeleteContactsByUserId(anything())).thenResolve(
      11,
    );

    const result = await usecase.deleteUserPermanently(
      testUserId,
      testLoginId,
      testAdminEmail,
    );

    expect(result.deletedUserId).toBe(testUserId);
    expect(result.deletionCounts).toMatchObject({
      activityGoalFreezePeriods: 6,
      activityLogs: 4,
      activityKinds: 3,
      activityGoals: 5,
      tasks: 7,
      activities: 2,
      apiKeys: 8,
      refreshTokens: 9,
      userProviders: 10,
      contacts: 11,
      userConsents: 0,
      user: 1,
    });
  });

  it("subscription なし: insertArchives は空配列で呼ばれ archived 件数は 0", async () => {
    when(mocks.userRepo.getUserById(anything())).thenResolve(mockUser);

    const result = await usecase.deleteUserPermanently(
      testUserId,
      testLoginId,
      testAdminEmail,
    );

    verify(mocks.archiveRepo.insertArchives(deepEqual([]))).called();
    expect(result.deletionCounts.subscriptionHistoriesArchived).toBe(0);
  });

  it("監査ログが adminEmail と deletionCounts を含んで記録される", async () => {
    when(mocks.userRepo.getUserById(anything())).thenResolve(mockUser);

    await usecase.deleteUserPermanently(
      testUserId,
      testLoginId,
      testAdminEmail,
    );

    verify(
      mocks.deletionLogRepo.insertDeletionLog(
        deepEqual({
          deletedUserId: testUserId,
          deletedLoginId: testLoginId,
          deletedName: "Test User",
          performedByAdminEmail: testAdminEmail,
          deletionCounts: {
            activityGoalFreezePeriods: 0,
            activityLogs: 0,
            activityKinds: 0,
            activityGoals: 0,
            tasks: 0,
            activities: 0,
            apiKeys: 0,
            refreshTokens: 0,
            userProviders: 0,
            userSubscriptions: 0,
            subscriptionHistoriesArchived: 0,
            contacts: 0,
            userConsents: 0,
            user: 1,
          },
        }),
      ),
    ).called();
  });
});
