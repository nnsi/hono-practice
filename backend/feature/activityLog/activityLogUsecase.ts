import { ActivityLog, UserId } from "@/backend/domain";
import { GetActivityStatsResponse } from "@/types/response";

export type ActivityLogUsecase = {
  getActivitiyLogs: (userId: UserId) => Promise<ActivityLog[]>;
  getActivityLog: () => Promise<ActivityLog>;
  createActivityLog: () => Promise<ActivityLog>;
  updateActivityLog: () => Promise<ActivityLog>;
  deleteActivityLog: () => Promise<void>;
  getStats: () => Promise<GetActivityStatsResponse[]>;
};
