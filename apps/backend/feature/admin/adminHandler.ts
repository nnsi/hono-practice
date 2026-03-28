import type { ContactUsecase } from "@backend/feature/contact/contactUsecase";

import type { AdminDashboardUsecase } from "./adminDashboardUsecase";

type ListUsersUsecase = {
  listUsers: (
    limit: number,
    offset: number,
  ) => Promise<{
    items: {
      id: string;
      loginId: string;
      name: string | null;
      createdAt: Date;
    }[];
    total: number;
  }>;
};

export type AdminHandler = {
  getDashboard: AdminDashboardUsecase["getDashboardData"];
  listUsers: ListUsersUsecase["listUsers"];
  listContacts: ContactUsecase["listContacts"];
  getContactById: ContactUsecase["getContactById"];
};

export function newAdminHandler(
  userUc: ListUsersUsecase,
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
