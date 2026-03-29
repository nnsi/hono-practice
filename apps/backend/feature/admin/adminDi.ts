import type { AppContext } from "@backend/context";
import { newContactRepository } from "@backend/feature/contact/contactRepository";
import { newContactUsecase } from "@backend/feature/contact/contactUsecase";
import { newUserRepository } from "@backend/feature/user/userRepository";
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
import { newAdminUserUsecase } from "./adminUserUsecase";
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
  return newAdminHandler(
    userUc,
    contactUc,
    dashboardUc,
    clientErrorProvider,
    apmProvider,
  );
}
