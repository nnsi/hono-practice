import type { ContactUsecase } from "@backend/feature/contact/contactUsecase";

import type { AdminDashboardUsecase } from "./adminDashboardUsecase";
import type { AdminUserUsecase } from "./adminUserUsecase";

export type AdminHandler = {
  getDashboard: AdminDashboardUsecase["getDashboardData"];
  listUsers: AdminUserUsecase["listUsers"];
  listContacts: ContactUsecase["listContacts"];
  getContactById: ContactUsecase["getContactById"];
};

export function newAdminHandler(
  userUc: AdminUserUsecase,
  contactUc: ContactUsecase,
  dashboardUc: AdminDashboardUsecase,
): AdminHandler {
  return {
    getDashboard: () => dashboardUc.getDashboardData(),
    listUsers: (limit, offset) => userUc.listUsers(limit, offset),
    listContacts: (limit, offset) => contactUc.listContacts(limit, offset),
    getContactById: (id) => contactUc.getContactById(id),
  };
}
