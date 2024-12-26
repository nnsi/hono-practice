import { HonoContext } from "@/backend/context";

import { ActivityLogUsecase } from ".";

export function newActivityLogHandler(uc: ActivityLogUsecase) {
  return {
    getActivitiyLogs: GetActivityLogs(uc),
    getActivityLog: getActivityLog(uc),
    createActivityLog: createActivityLog(uc),
    updateActivityLog: updateActivityLog(uc),
    deleteActivityLog: deleteActivityLog(uc),
    getStats: getStats(uc),
  };
}

function GetActivityLogs(uc: ActivityLogUsecase) {
  return async (c: HonoContext) => {
    const logs = await uc.getActivitiyLogs(c.get("userId"));
    return c.json({ logs }, 200);
  };
}
