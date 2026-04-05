import { AppError } from "@backend/error";
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

import type { AdminUserDeletionLogRepository } from "./adminUserDeletionLogRepository";
import type {
  NewSubscriptionHistoryArchive,
  SubscriptionHistoryArchiveRepository,
} from "./subscriptionHistoryArchiveRepository";

type DeletionCounts = {
  activityGoalFreezePeriods: number;
  activityLogs: number;
  activityKinds: number;
  activityGoals: number;
  tasks: number;
  activities: number;
  apiKeys: number;
  refreshTokens: number;
  userProviders: number;
  userSubscriptions: number;
  subscriptionHistoriesArchived: number;
  contacts: number;
  userConsents: number;
  user: number;
};

export type AdminUserDeletionUsecase = {
  deleteUserPermanently: (
    userId: string,
    loginIdConfirmation: string,
    performedByAdminEmail: string,
  ) => Promise<{
    deletedUserId: string;
    deletionCounts: DeletionCounts;
  }>;
};

export function newAdminUserDeletionUsecase(
  txRunner: TransactionRunner,
  userRepo: UserRepository,
  activityRepo: ActivityRepository,
  activityLogRepo: ActivityLogRepository,
  activityGoalRepo: ActivityGoalRepository,
  freezePeriodRepo: GoalFreezePeriodRepository,
  taskRepo: TaskRepository,
  apiKeyRepo: ApiKeyRepository,
  refreshTokenRepo: RefreshTokenRepository,
  userProviderRepo: UserProviderRepository,
  subscriptionRepo: SubscriptionRepository,
  subscriptionHistoryRepo: SubscriptionHistoryRepository,
  archiveRepo: SubscriptionHistoryArchiveRepository,
  deletionLogRepo: AdminUserDeletionLogRepository,
  contactRepo: ContactRepository,
  userConsentRepo: UserConsentRepository,
): AdminUserDeletionUsecase {
  return {
    deleteUserPermanently: async (
      userId,
      loginIdConfirmation,
      performedByAdminEmail,
    ) => {
      const uid = createUserId(userId);

      const user = await userRepo.getUserById(uid);
      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (user.loginId !== loginIdConfirmation) {
        throw new AppError("loginId confirmation mismatch", 400);
      }

      const counts = await txRunner.run(
        [
          userRepo,
          activityRepo,
          activityLogRepo,
          activityGoalRepo,
          freezePeriodRepo,
          taskRepo,
          apiKeyRepo,
          refreshTokenRepo,
          userProviderRepo,
          subscriptionRepo,
          subscriptionHistoryRepo,
          archiveRepo,
          deletionLogRepo,
          contactRepo,
          userConsentRepo,
        ],
        async (tx) => {
          const subscription = await tx.findSubscriptionByUserId(uid);
          const histories = subscription
            ? await tx.findSubscriptionHistoriesBySubscriptionIds([
                subscription.id,
              ])
            : [];

          const archives: NewSubscriptionHistoryArchive[] = histories.map(
            (h) => ({
              originalHistoryId: h.id,
              originalSubscriptionId: h.subscriptionId,
              deletedUserId: userId,
              deletedLoginId: user.loginId ?? "",
              eventType: h.eventType,
              plan: h.plan,
              status: h.status,
              source: h.source,
              webhookId: h.webhookId ?? null,
              originalCreatedAt: h.createdAt,
            }),
          );

          const subscriptionHistoriesArchived =
            await tx.insertArchives(archives);

          const activityGoalFreezePeriods =
            await tx.hardDeleteGoalFreezePeriodsByUserId(uid);
          const activityLogs = await tx.hardDeleteActivityLogsByUserId(uid);
          const activityGoals = await tx.hardDeleteActivityGoalsByUserId(uid);
          // task は activity_kind を FK 参照しているため activity_kind より先に削除
          const taskCount = await tx.hardDeleteTasksByUserId(uid);
          const activityKinds = await tx.hardDeleteActivityKindsByUserId(uid);
          const activities = await tx.hardDeleteActivitiesByUserId(uid);
          const apiKeys = await tx.hardDeleteApiKeysByUserId(userId);
          const refreshTokens = await tx.hardDeleteRefreshTokensByUserId(uid);
          const userProviders =
            await tx.hardDeleteUserProvidersByUserId(userId);

          const subscriptionIds = subscription ? [subscription.id] : [];
          await tx.hardDeleteSubscriptionHistoriesBySubscriptionIds(
            subscriptionIds,
          );
          const userSubscriptions =
            await tx.hardDeleteUserSubscriptionsByUserId(uid);
          const contacts = await tx.hardDeleteContactsByUserId(uid);
          const userConsents = await tx.hardDeleteUserConsentsByUserId(uid);
          const userDeleted = await tx.hardDeleteUserById(uid);

          const result: DeletionCounts = {
            activityGoalFreezePeriods,
            activityLogs,
            activityKinds,
            activityGoals,
            tasks: taskCount,
            activities,
            apiKeys,
            refreshTokens,
            userProviders,
            userSubscriptions,
            subscriptionHistoriesArchived,
            contacts,
            userConsents,
            user: userDeleted,
          };

          await tx.insertDeletionLog({
            deletedUserId: userId,
            deletedLoginId: user.loginId ?? "",
            deletedName: user.name ?? null,
            performedByAdminEmail,
            deletionCounts: result,
          });

          return result;
        },
      );

      return { deletedUserId: userId, deletionCounts: counts };
    },
  };
}
