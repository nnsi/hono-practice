import { HonoContext } from "@/backend/context";
import {
  createActivityId,
  createActivityKindId,
  createActivityLogId,
} from "@/backend/domain";
import { AppError } from "@/backend/error";
import dayjs from "@/backend/lib/dayjs";
import {
  CreateActivityLogRequest,
  UpdateActivityLogRequest,
} from "@/types/request";
import {
  GetActivityLogResponseSchema,
  GetActivityLogsResponseSchema,
} from "@/types/response";

import { ActivityLogUsecase, GetActivityLogsParams } from ".";

export function newActivityLogHandler(uc: ActivityLogUsecase) {
  return {
    getActivityLogs: GetActivityLogs(uc),
    getActivityLog: getActivityLog(uc),
    createActivityLog: createActivityLog(uc),
    updateActivityLog: updateActivityLog(uc),
    deleteActivityLog: deleteActivityLog(uc),
    getStats: getStats(uc),
  };
}

function GetActivityLogs(uc: ActivityLogUsecase) {
  return async (c: HonoContext) => {
    const { date } = c.req.query();
    if (!date) {
      throw new AppError("invalid query");
    }

    const dayOrDate = date.split("-").length === 2 ? "month" : "day";
    const from = dayjs(date).startOf(dayOrDate).toDate();
    const to = dayjs(date).endOf(dayOrDate).toDate();

    const params: GetActivityLogsParams = { from, to };

    const logs = await uc.getActivityLogs(c.get("userId"), params);

    const parsedLogs = GetActivityLogsResponseSchema.safeParse(logs);
    if (!parsedLogs.success) {
      console.log(logs);
      throw new AppError("Invalid parse");
    }

    return c.json(parsedLogs.data);
  };
}

function getActivityLog(uc: ActivityLogUsecase) {
  return async (c: HonoContext, id: string) => {
    const activityLogId = createActivityLogId(id);

    const log = await uc.getActivityLog(c.get("userId"), activityLogId);

    const parsedLog = GetActivityLogResponseSchema.safeParse(log);
    if (!parsedLog.success) {
      throw new AppError("Invalid parse");
    }

    return c.json(parsedLog.data);
  };
}

function createActivityLog(uc: ActivityLogUsecase) {
  return async (c: HonoContext) => {
    const params = await c.req.json<CreateActivityLogRequest>();
    const activityId = createActivityId(params.activityId);
    const activityKindId = createActivityKindId(params.activityKindId);

    const log = await uc.createActivityLog(
      c.get("userId"),
      activityId,
      activityKindId,
      params
    );

    const parsedLog = GetActivityLogResponseSchema.safeParse(log);
    if (!parsedLog.success) {
      throw new AppError("Invalid parse");
    }

    return c.json(parsedLog.data);
  };
}

function updateActivityLog(uc: ActivityLogUsecase) {
  return async (c: HonoContext, id: string) => {
    const activityLogId = createActivityLogId(id);
    const params = await c.req.json<UpdateActivityLogRequest>();

    const log = await uc.updateActivityLog(
      c.get("userId"),
      activityLogId,
      params
    );

    const parsedLog = GetActivityLogResponseSchema.safeParse(log);
    if (!parsedLog.success) {
      throw new AppError("Invalid parse");
    }

    return c.json(parsedLog.data, 200);
  };
}

function deleteActivityLog(uc: ActivityLogUsecase) {
  return async (c: HonoContext, id: string) => {
    const activityLogId = createActivityLogId(id);
    await uc.deleteActivityLog(c.get("userId"), activityLogId);
    return c.json({ message: "success" }, 200);
  };
}

function getStats(uc: ActivityLogUsecase) {
  return async (c: HonoContext) => {
    const { date } = c.req.query();
    if (!date) {
      throw new AppError("invalid query");
    }

    const dayOrDate = date.split("-").length === 2 ? "month" : "day";
    const from = dayjs(date).startOf(dayOrDate).toDate();
    const to = dayjs(date).endOf(dayOrDate).toDate();

    const stats = await uc.getStats(c.get("userId"), { from, to });

    return c.json({ stats }, 200);
  };
}
