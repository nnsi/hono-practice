import type { ActivityId } from "@packages/domain/activity/activitySchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { AppError } from "@backend/error";
import type { CreateActivityRequest } from "@dtos/request/CreateActivityRequest";
import type {
  UpdateActivityOrderRequest,
  UpdateActivityRequest,
} from "@dtos/request/UpdateActivityRequest";
import {
  GetActivitiesResponseSchema,
  GetActivityResponseSchema,
} from "@dtos/response/GetActivitiesResponse";

import type { ActivityUsecase } from ".";

export function newActivityHandler(uc: ActivityUsecase) {
  return {
    getActivities: getActivities(uc),
    getActivity: getActivity(uc),
    createActivity: createActivity(uc),
    updateActivity: updateActivity(uc),
    deleteActivity: deleteActivity(uc),
    updateActivityOrder: updateActivityOrder(uc),
    uploadActivityIcon: uploadActivityIcon(uc),
    deleteActivityIcon: deleteActivityIcon(uc),
  };
}

function getActivities(uc: ActivityUsecase) {
  return async (userId: UserId) => {
    const activities = await uc.getActivities(userId);

    const parsedActivities = GetActivitiesResponseSchema.safeParse(activities);
    if (!parsedActivities.success) {
      throw new AppError("failed to parse activities", 500);
    }

    return parsedActivities.data;
  };
}

function getActivity(uc: ActivityUsecase) {
  return async (userId: UserId, id: ActivityId) => {
    const activity = await uc.getActivity(userId, id);

    const parsedActivity = GetActivityResponseSchema.safeParse(activity);
    if (!parsedActivity.success) {
      throw new AppError("failed to parse activity", 500);
    }

    return parsedActivity.data;
  };
}

function createActivity(uc: ActivityUsecase) {
  return async (userId: UserId, params: CreateActivityRequest) => {
    const activity = await uc.createActivity(userId, params);

    const parsedActivity = GetActivityResponseSchema.safeParse(activity);
    if (!parsedActivity.success) {
      throw new AppError("failed to parse activity", 500);
    }

    return parsedActivity.data;
  };
}

function updateActivity(uc: ActivityUsecase) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    json: UpdateActivityRequest,
  ) => {
    const activity = await uc.updateActivity(userId, activityId, json);

    const parsedActivity = GetActivityResponseSchema.safeParse(activity);
    if (!parsedActivity.success) {
      throw new AppError("failed to parse activity", 500);
    }
    return parsedActivity.data;
  };
}

function deleteActivity(uc: ActivityUsecase) {
  return async (userId: UserId, activityId: ActivityId) => {
    await uc.deleteActivity(userId, activityId);

    return { message: "success" };
  };
}

function updateActivityOrder(uc: ActivityUsecase) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    params: UpdateActivityOrderRequest,
  ) => {
    await uc.updateActivityOrder(userId, activityId, params);

    return { message: "success" };
  };
}

function uploadActivityIcon(uc: ActivityUsecase) {
  return async (
    userId: UserId,
    activityId: ActivityId,
    base64: string,
    mimeType: string,
    apiBaseUrl: string,
  ) => {
    return await uc.uploadActivityIcon(
      userId,
      activityId,
      base64,
      mimeType,
      apiBaseUrl,
    );
  };
}

function deleteActivityIcon(uc: ActivityUsecase) {
  return async (userId: UserId, activityId: ActivityId) => {
    await uc.deleteActivityIcon(userId, activityId);

    return { success: true };
  };
}
