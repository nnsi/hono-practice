import type { ContactRepository } from "@backend/feature/contact/contactRepository";
import type { UserRepository } from "@backend/feature/user/userRepository";
import type { AdminDashboardQueryService } from "@backend/query/adminDashboardQueryService";

export type AdminHandler = {
  getDashboard: AdminDashboardQueryService["getDashboardData"];
  listUsers: (
    limit: number,
    offset: number,
  ) => ReturnType<UserRepository["listUsers"]>;
  listContacts: (
    limit: number,
    offset: number,
  ) => ReturnType<ContactRepository["listContacts"]>;
  getContactById: (
    id: string,
  ) => ReturnType<ContactRepository["getContactById"]>;
};

export function newAdminHandler(
  userRepo: UserRepository,
  contactRepo: ContactRepository,
  dashboardQs: AdminDashboardQueryService,
): AdminHandler {
  return {
    getDashboard: () => dashboardQs.getDashboardData(),
    listUsers: (limit, offset) => userRepo.listUsers(limit, offset),
    listContacts: (limit, offset) => contactRepo.listContacts(limit, offset),
    getContactById: (id) => contactRepo.getContactById(id),
  };
}
