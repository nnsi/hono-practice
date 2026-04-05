import type { ActivityRepository } from "@backend/feature/activity/activityRepository";
import type { ActivityGoalRepository } from "@backend/feature/activitygoal/activityGoalRepository";
import type { ActivityLogRepository } from "@backend/feature/activityLog/activityLogRepository";
import type { ApiKeyRepository } from "@backend/feature/apiKey/apiKeyRepository";
import type { RefreshTokenRepository } from "@backend/feature/auth/refreshTokenRepository";
import type { UserProviderRepository } from "@backend/feature/auth/userProviderRepository";
import type { ContactRepository } from "@backend/feature/contact/contactRepository";
import type { GoalFreezePeriodRepository } from "@backend/feature/goalFreezePeriod/goalFreezePeriodRepository";
import type { SubscriptionHistoryRepository } from "@backend/feature/subscription/subscriptionHistoryRepository";
import type { SubscriptionRepository } from "@backend/feature/subscription/subscriptionRepository";
import type { TaskRepository } from "@backend/feature/task/taskRepository";
import type { UserConsentRepository } from "@backend/feature/user/userConsentRepository";
import type { UserRepository } from "@backend/feature/user/userRepository";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import { createUserId } from "@packages/domain/user/userSchema";
import { anything, instance, mock, reset, when } from "ts-mockito";

import type { AdminUserDeletionLogRepository } from "../adminUserDeletionLogRepository";
import { newAdminUserDeletionUsecase } from "../adminUserDeletionUsecase";
import type { SubscriptionHistoryArchiveRepository } from "../subscriptionHistoryArchiveRepository";

export const fakeTxRunner: TransactionRunner = {
  async run(repositories, operation) {
    const merged = Object.assign({}, ...repositories);
    return operation(merged);
  },
};

export const testUserId = "00000000-0000-4000-8000-000000000001";
export const testLoginId = "test@example.com";
export const testAdminEmail = "admin@example.com";

export const mockUser = {
  type: "persisted" as const,
  id: createUserId(testUserId),
  loginId: testLoginId,
  name: "Test User",
  password: "hashed",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export type Mocks = {
  userRepo: UserRepository;
  activityRepo: ActivityRepository;
  activityLogRepo: ActivityLogRepository;
  activityGoalRepo: ActivityGoalRepository;
  freezePeriodRepo: GoalFreezePeriodRepository;
  taskRepo: TaskRepository;
  apiKeyRepo: ApiKeyRepository;
  refreshTokenRepo: RefreshTokenRepository;
  userProviderRepo: UserProviderRepository;
  subscriptionRepo: SubscriptionRepository;
  subscriptionHistoryRepo: SubscriptionHistoryRepository;
  archiveRepo: SubscriptionHistoryArchiveRepository;
  deletionLogRepo: AdminUserDeletionLogRepository;
  contactRepo: ContactRepository;
  userConsentRepo: UserConsentRepository;
};

export function createMocks(): Mocks {
  return {
    userRepo: mock<UserRepository>(),
    activityRepo: mock<ActivityRepository>(),
    activityLogRepo: mock<ActivityLogRepository>(),
    activityGoalRepo: mock<ActivityGoalRepository>(),
    freezePeriodRepo: mock<GoalFreezePeriodRepository>(),
    taskRepo: mock<TaskRepository>(),
    apiKeyRepo: mock<ApiKeyRepository>(),
    refreshTokenRepo: mock<RefreshTokenRepository>(),
    userProviderRepo: mock<UserProviderRepository>(),
    subscriptionRepo: mock<SubscriptionRepository>(),
    subscriptionHistoryRepo: mock<SubscriptionHistoryRepository>(),
    archiveRepo: mock<SubscriptionHistoryArchiveRepository>(),
    deletionLogRepo: mock<AdminUserDeletionLogRepository>(),
    contactRepo: mock<ContactRepository>(),
    userConsentRepo: mock<UserConsentRepository>(),
  };
}

export function createUsecase(m: Mocks) {
  return newAdminUserDeletionUsecase(
    fakeTxRunner,
    instance(m.userRepo),
    instance(m.activityRepo),
    instance(m.activityLogRepo),
    instance(m.activityGoalRepo),
    instance(m.freezePeriodRepo),
    instance(m.taskRepo),
    instance(m.apiKeyRepo),
    instance(m.refreshTokenRepo),
    instance(m.userProviderRepo),
    instance(m.subscriptionRepo),
    instance(m.subscriptionHistoryRepo),
    instance(m.archiveRepo),
    instance(m.deletionLogRepo),
    instance(m.contactRepo),
    instance(m.userConsentRepo),
  );
}

export function resetMocks(m: Mocks): void {
  reset(m.userRepo);
  reset(m.activityRepo);
  reset(m.activityLogRepo);
  reset(m.activityGoalRepo);
  reset(m.freezePeriodRepo);
  reset(m.taskRepo);
  reset(m.apiKeyRepo);
  reset(m.refreshTokenRepo);
  reset(m.userProviderRepo);
  reset(m.subscriptionRepo);
  reset(m.subscriptionHistoryRepo);
  reset(m.archiveRepo);
  reset(m.deletionLogRepo);
  reset(m.contactRepo);
  reset(m.userConsentRepo);
}

export function setupDefaultStubs(m: Mocks): void {
  when(m.subscriptionRepo.findSubscriptionByUserId(anything())).thenResolve(
    undefined,
  );
  when(
    m.subscriptionHistoryRepo.findSubscriptionHistoriesBySubscriptionIds(
      anything(),
    ),
  ).thenResolve([]);
  when(m.archiveRepo.insertArchives(anything())).thenResolve(0);
  when(
    m.freezePeriodRepo.hardDeleteGoalFreezePeriodsByUserId(anything()),
  ).thenResolve(0);
  when(
    m.activityLogRepo.hardDeleteActivityLogsByUserId(anything()),
  ).thenResolve(0);
  when(m.activityRepo.hardDeleteActivityKindsByUserId(anything())).thenResolve(
    0,
  );
  when(
    m.activityGoalRepo.hardDeleteActivityGoalsByUserId(anything()),
  ).thenResolve(0);
  when(m.taskRepo.hardDeleteTasksByUserId(anything())).thenResolve(0);
  when(m.activityRepo.hardDeleteActivitiesByUserId(anything())).thenResolve(0);
  when(m.apiKeyRepo.hardDeleteApiKeysByUserId(anything())).thenResolve(0);
  when(
    m.refreshTokenRepo.hardDeleteRefreshTokensByUserId(anything()),
  ).thenResolve(0);
  when(
    m.userProviderRepo.hardDeleteUserProvidersByUserId(anything()),
  ).thenResolve(0);
  when(
    m.subscriptionHistoryRepo.hardDeleteSubscriptionHistoriesBySubscriptionIds(
      anything(),
    ),
  ).thenResolve(0);
  when(
    m.subscriptionRepo.hardDeleteUserSubscriptionsByUserId(anything()),
  ).thenResolve(0);
  when(m.contactRepo.hardDeleteContactsByUserId(anything())).thenResolve(0);
  when(
    m.userConsentRepo.hardDeleteUserConsentsByUserId(anything()),
  ).thenResolve(0);
  when(m.userRepo.hardDeleteUserById(anything())).thenResolve(1);
  when(m.deletionLogRepo.insertDeletionLog(anything())).thenResolve(undefined);
}
