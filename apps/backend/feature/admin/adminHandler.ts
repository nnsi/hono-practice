import type { ContactUsecase } from "@backend/feature/contact/contactUsecase";
import type { ApmProvider } from "@backend/query/apmProvider";
import type { ClientErrorProvider } from "@backend/query/clientErrorProvider";

import type { AdminDashboardUsecase } from "./adminDashboardUsecase";
import type { AdminUserUsecase } from "./adminUserUsecase";

export type AdminHandler = {
  getDashboard: AdminDashboardUsecase["getDashboardData"];
  listUsers: AdminUserUsecase["listUsers"];
  listContacts: ContactUsecase["listContacts"];
  getContactById: ContactUsecase["getContactById"];
  getClientErrorDetails: ClientErrorProvider["getDetails"];
  getApiErrorDetails: ApmProvider["getErrorDetails"];
};

export function newAdminHandler(
  userUc: AdminUserUsecase,
  contactUc: ContactUsecase,
  dashboardUc: AdminDashboardUsecase,
  clientErrorProvider: ClientErrorProvider,
  apmProvider: ApmProvider,
): AdminHandler {
  return {
    getDashboard: () => dashboardUc.getDashboardData(),
    listUsers: (limit, offset) => userUc.listUsers(limit, offset),
    listContacts: (limit, offset) => contactUc.listContacts(limit, offset),
    getContactById: (id) => contactUc.getContactById(id),
    getClientErrorDetails: (platform) =>
      clientErrorProvider.getDetails(platform),
    getApiErrorDetails: (kind) => apmProvider.getErrorDetails(kind),
  };
}
