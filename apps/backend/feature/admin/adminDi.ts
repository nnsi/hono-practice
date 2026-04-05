import type { AppContext } from "@backend/context";
import { newActivityRepository } from "@backend/feature/activity/activityRepository";
import { newActivityGoalRepository } from "@backend/feature/activitygoal/activityGoalRepository";
import { newActivityLogRepository } from "@backend/feature/activityLog/activityLogRepository";
import { newApiKeyRepository } from "@backend/feature/apiKey/apiKeyRepository";
import { newRefreshTokenRepository } from "@backend/feature/auth/refreshTokenRepository";
import { newUserProviderRepository } from "@backend/feature/auth/userProviderRepository";
import { newContactRepository } from "@backend/feature/contact/contactRepository";
import { newContactUsecase } from "@backend/feature/contact/contactUsecase";
import { newGoalFreezePeriodRepository } from "@backend/feature/goalFreezePeriod/goalFreezePeriodRepository";
import { newSubscriptionHistoryRepository } from "@backend/feature/subscription/subscriptionHistoryRepository";
import { newSubscriptionRepository } from "@backend/feature/subscription/subscriptionRepository";
import { newTaskRepository } from "@backend/feature/task/taskRepository";
import { newUserRepository } from "@backend/feature/user/userRepository";
import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle/drizzleTransaction";
import { noopTracer } from "@backend/lib/tracer";
import { newAdminDashboardQueryService } from "@backend/query/adminDashboardQueryService";
import {
  newMockApmProvider,
  newNullApmProvider,
} from "@backend/query/apmProvider";
import {
  newMockClientErrorProvider,
  newNullClientErrorProvider,
} from "@backend/query/clientErrorProvider";

import { newAdminDashboardUsecase } from "./adminDashboardUsecase";
import { newAdminHandler } from "./adminHandler";
import { newAdminSubscriptionUsecase } from "./adminSubscriptionUsecase";
import { newAdminUserDeletionLogRepository } from "./adminUserDeletionLogRepository";
import { newAdminUserDeletionUsecase } from "./adminUserDeletionUsecase";
import { newAdminUserUsecase } from "./adminUserUsecase";
import { newSubscriptionHistoryArchiveRepository } from "./subscriptionHistoryArchiveRepository";
import { newWaeClientErrorProvider } from "./waeClientErrorQuery";
import { newWaeApmProvider } from "./waeQuery";

export function resolveAdminHandler(c: {
  env: AppContext["Bindings"];
  get: (key: "tracer") => AppContext["Variables"]["tracer"] | undefined;
}) {
  const db = c.env.DB;
  const tracer = c.get("tracer") ?? noopTracer;
  const userRepo = newUserRepository(db);
  const contactRepo = newContactRepository(db);
  const userUc = newAdminUserUsecase(userRepo, tracer);
  const contactUc = newContactUsecase(contactRepo, tracer);
  const isDev = c.env.NODE_ENV === "development";
  const cfApiToken = c.env.CF_WORKERS_TOKEN;
  const cfAccountId = c.env.CF_ACCOUNT_ID;
  const apmProvider =
    cfApiToken && cfAccountId
      ? newWaeApmProvider(cfApiToken, cfAccountId)
      : isDev
        ? newMockApmProvider()
        : newNullApmProvider();
  const clientErrorProvider =
    cfApiToken && cfAccountId
      ? newWaeClientErrorProvider(cfApiToken, cfAccountId)
      : isDev
        ? newMockClientErrorProvider()
        : newNullClientErrorProvider();
  const dashboardQs = newAdminDashboardQueryService(
    db,
    apmProvider,
    clientErrorProvider,
  );
  const dashboardUc = newAdminDashboardUsecase(dashboardQs, tracer);
  const subscriptionRepo = newSubscriptionRepository(db);
  const subscriptionHistoryRepo = newSubscriptionHistoryRepository(db);
  const txRunner = newDrizzleTransactionRunner(db);
  const subscriptionUc = newAdminSubscriptionUsecase(
    txRunner,
    userRepo,
    subscriptionRepo,
    subscriptionHistoryRepo,
    tracer,
  );
  const activityRepo = newActivityRepository(db);
  const activityLogRepo = newActivityLogRepository(db);
  const activityGoalRepo = newActivityGoalRepository(db);
  const freezePeriodRepo = newGoalFreezePeriodRepository(db);
  const taskRepo = newTaskRepository(db);
  const apiKeyRepo = newApiKeyRepository(db);
  const refreshTokenRepo = newRefreshTokenRepository(db);
  const userProviderRepo = newUserProviderRepository(db);
  const archiveRepo = newSubscriptionHistoryArchiveRepository(db);
  const deletionLogRepo = newAdminUserDeletionLogRepository(db);
  const deletionUc = newAdminUserDeletionUsecase(
    txRunner,
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
  );
  return newAdminHandler(
    userUc,
    contactUc,
    dashboardUc,
    clientErrorProvider,
    apmProvider,
    subscriptionUc,
    deletionUc,
  );
}
