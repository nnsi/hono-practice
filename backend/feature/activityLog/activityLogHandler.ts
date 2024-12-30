import {
  createActivityId,
  createActivityKindId,
  createActivityLogId,
  type UserId,
} from "@/backend/domain";
import { AppError } from "@/backend/error";
import dayjs from "@/backend/lib/dayjs";
import type {
  CreateActivityLogRequest,
  UpdateActivityLogRequest,
} from "@/types/request";
import {
  GetActivityLogResponseSchema,
  GetActivityLogsResponseSchema,
} from "@/types/response";

import type { ActivityLogUsecase, GetActivityLogsParams } from ".";

export function newActivityLogHandler(uc: ActivityLogUsecase) {
  return {
    getActivityLogs: getActivityLogs(uc),
    getActivityLog: getActivityLog(uc),
    createActivityLog: createActivityLog(uc),
    updateActivityLog: updateActivityLog(uc),
    deleteActivityLog: deleteActivityLog(uc),
    getStats: getStats(uc),
  };
}

function getActivityLogs(uc: ActivityLogUsecase) {
  return async (userId: UserId, query: { date?: string }) => {
    const date = query.date || dayjs().format("YYYY-MM-DD");

    const dayOrDate = date.split("-").length === 2 ? "month" : "day";
    const from = dayjs(date).startOf(dayOrDate).toDate();
    const to = dayjs(date).endOf(dayOrDate).toDate();

    const params: GetActivityLogsParams = { from, to };

    const logs = await uc.getActivityLogs(userId, params);

    const parsedLogs = GetActivityLogsResponseSchema.safeParse(logs);
    if (!parsedLogs.success) {
      console.log(logs);
      throw new AppError("Invalid parse");
    }

    return parsedLogs.data;
  };
}

function getActivityLog(uc: ActivityLogUsecase) {
  return async (userId: UserId, id: string) => {
    const activityLogId = createActivityLogId(id);

    const log = await uc.getActivityLog(userId, activityLogId);

    const parsedLog = GetActivityLogResponseSchema.safeParse(log);
    if (!parsedLog.success) {
      throw new AppError("Invalid parse");
    }

    return parsedLog.data;
  };
}

function createActivityLog(uc: ActivityLogUsecase) {
  return async (userId: UserId, params: CreateActivityLogRequest) => {
    const activityId = createActivityId(params.activityId);
    const activityKindId = createActivityKindId(params.activityKindId);

    const log = await uc.createActivityLog(
      userId,
      activityId,
      activityKindId,
      params,
    );

    const parsedLog = GetActivityLogResponseSchema.safeParse(log);
    if (!parsedLog.success) {
      throw new AppError("Invalid parse");
    }

    return parsedLog.data;
  };
}

function updateActivityLog(uc: ActivityLogUsecase) {
  return async (
    userId: UserId,
    id: string,
    params: UpdateActivityLogRequest,
  ) => {
    const activityLogId = createActivityLogId(id);

    const log = await uc.updateActivityLog(userId, activityLogId, params);

    const parsedLog = GetActivityLogResponseSchema.safeParse(log);
    if (!parsedLog.success) {
      throw new AppError("Invalid parse");
    }

    return parsedLog.data;
  };
}

function deleteActivityLog(uc: ActivityLogUsecase) {
  return async (userId: UserId, id: string) => {
    const activityLogId = createActivityLogId(id);
    
    await uc.deleteActivityLog(userId, activityLogId);

    return { message: "success" };
  };
}

function getStats(uc: ActivityLogUsecase) {
  return async (userId: UserId, query: { date?: string }) => {
    const { date } = query;
    if (!date) {
      throw new AppError("invalid query");
    }

    const dayOrDate = date.split("-").length === 2 ? "month" : "day";
    const from = dayjs(date).startOf(dayOrDate).toDate();
    const to = dayjs(date).endOf(dayOrDate).toDate();

    const stats = await uc.getStats(userId, { from, to });

    return stats;
  };
}
