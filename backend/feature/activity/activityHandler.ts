import { HonoContext } from "@/backend/context";
import { AppError } from "@/backend/error";
import { CreateActivityRequest } from "@/types/request/CreateActivityRequest";
import {
  UpdateActivityOrderRequest,
  UpdateActivityRequest,
} from "@/types/request/UpdateActivityRequest";
import {
  GetActivitiesResponseSchema,
  GetActivityResponseSchema,
} from "@/types/response/GetActivitiesResponse";

import { ActivityUsecase } from ".";

export function newActivityHandler(uc: ActivityUsecase) {
  return {
    getActivities: getActivities(uc),
    getActivity: getActivity(uc),
    createActivity: createActivity(uc),
    updateActivity: updateActivity(uc),
    deleteActivity: deleteActivity(uc),
    updateActivityOrder: updateActivityOrder(uc),
  };
}

function getActivities(uc: ActivityUsecase) {
  return async (c: HonoContext) => {
    const activities = await uc.getActivities(c.get("userId"));
    const parsedActivities = GetActivitiesResponseSchema.safeParse(activities);
    if (!parsedActivities.success) {
      throw new AppError("failed to parse activities", 500);
    }
    return c.json(parsedActivities.data);
  };
}

function getActivity(uc: ActivityUsecase) {
  return async (c: HonoContext, id: string) => {
    const activity = await uc.getActivity(c.get("userId"), id);

    const parsedActivity = GetActivityResponseSchema.safeParse(activity);
    if (!parsedActivity.success) {
      throw new AppError("failed to parse activity", 500);
    }

    return c.json(parsedActivity.data);
  };
}

function createActivity(uc: ActivityUsecase) {
  return async (c: HonoContext, json: CreateActivityRequest) => {
    const activity = await uc.createActivity(c.get("userId"), json);

    const parsedActivity = GetActivityResponseSchema.safeParse(activity);
    if (!parsedActivity.success) {
      throw new AppError("failed to parse activity", 500);
    }

    return c.json(parsedActivity.data);
  };
}

function updateActivity(uc: ActivityUsecase) {
  return async (c: HonoContext, id: string, json: UpdateActivityRequest) => {
    const activity = await uc.updateActivity(c.get("userId"), id, json);

    const parsedActivity = GetActivityResponseSchema.safeParse(activity);
    if (!parsedActivity.success) {
      throw new AppError("failed to parse activity", 500);
    }
    return c.json(parsedActivity.data);
  };
}

function deleteActivity(uc: ActivityUsecase) {
  return async (c: HonoContext, id: string) => {
    await uc.deleteActivity(c.get("userId"), id);

    return c.json({ message: "success" });
  };
}

function updateActivityOrder(uc: ActivityUsecase) {
  return async (
    c: HonoContext,
    id: string,
    json: UpdateActivityOrderRequest
  ) => {
    await uc.updateActivityOrder(c.get("userId"), id, json);

    return c.json({ message: "success" });
  };
}
