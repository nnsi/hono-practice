import { ActivityLog, UserId, ActivityLogId } from "@/backend/domain";

export type ActivityLogRepository = {
  getActivitiesByUserId: (userId: UserId) => Promise<ActivityLog[]>;
  getActivityByIdAndUserId: (
    userId: UserId,
    activityLogId: ActivityLogId
  ) => Promise<ActivityLog>;
  createActivityLog: (activityLog: ActivityLog) => Promise<ActivityLog>;
  updateActivityLog: (activityLog: ActivityLog) => Promise<ActivityLog>;
  deleteActivityLog: (activityLog: ActivityLog) => Promise<void>;
};
