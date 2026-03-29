import type { Tracer } from "@backend/lib/tracer";
import type { AdminDashboardQueryService } from "@backend/query/adminDashboardQueryService";

export type AdminDashboardUsecase = {
  getDashboardData: AdminDashboardQueryService["getDashboardData"];
};

export function newAdminDashboardUsecase(
  qs: AdminDashboardQueryService,
  tracer: Tracer,
): AdminDashboardUsecase {
  return {
    getDashboardData: async () => {
      return tracer.span("admin.getDashboardData", () => qs.getDashboardData());
    },
  };
}
