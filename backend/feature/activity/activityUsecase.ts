import { Activity, createActivityId, createUserId } from "@/backend/domain";
import { ResourceNotFoundError } from "@/backend/error";
import { TransactionScope } from "@/backend/infra/db";
import { generateOrder } from "@/backend/lib/lexicalOrder";
import { CreateActivityRequest, UpdateActivityRequest } from "@/types/request";

import { ActivityRepository, newActivityRepository } from ".";

export type ActivityUsecase = {
  getActivities(userId: string): Promise<Activity[]>;
  getActivity(userId: string, id: string): Promise<Activity>;
  createActivity(userId: string, req: CreateActivityRequest): Promise<Activity>;
  updateActivity(
    userId: string,
    id: string,
    req: UpdateActivityRequest
  ): Promise<Activity>;
  deleteActivity(userId: string, id: string): Promise<void>;
};

export function newActivityUsecase(
  repo: ActivityRepository,
  runInTx: TransactionScope
): ActivityUsecase {
  return {
    getActivities: getActivities(repo),
    getActivity: getActivity(repo),
    createActivity: createActivity(repo),
    updateActivity: updateActivity(repo, runInTx),
    deleteActivity: deleteActivity(repo),
  };
}

function getActivities(repo: ActivityRepository) {
  return async (userId: string) => {
    const typedUserId = createUserId(userId);
    const activity = await repo.getActivitiesByUserId(typedUserId);
    if (!activity) throw new ResourceNotFoundError("activity not found");

    return activity;
  };
}

function getActivity(repo: ActivityRepository) {
  return async (userId: string, id: string) => {
    const typedUserId = createUserId(userId);
    const typedId = createActivityId(id);

    const activity = await repo.getActivityByIdAndUserId(typedUserId, typedId);
    if (!activity) throw new ResourceNotFoundError("activity not found");

    return activity;
  };
}

function createActivity(repo: ActivityRepository) {
  return async (userId: string, params: CreateActivityRequest) => {
    const typedUserId = createUserId(userId);
    const lastOrderIndex = await repo.getLastOrderIndexByUserId(typedUserId);

    const orderIndex = generateOrder(lastOrderIndex ?? "", null);

    const activity = Activity.create({
      userId: userId,
      name: params.name,
      label: params.label,
      emoji: params.emoji,
      description: params.description,
      quantityLabel: params.quantityLabel,
      orderIndex: orderIndex,
    });

    return await repo.createActivity(activity);
  };
}

function updateActivity(repo: ActivityRepository, runInTx: TransactionScope) {
  return async (userId: string, id: string, params: UpdateActivityRequest) => {
    const typedUserId = createUserId(userId);
    const typedId = createActivityId(id);

    const activity = await repo.getActivityByIdAndUserId(typedUserId, typedId);
    if (!activity) throw new ResourceNotFoundError("activity not found");

    const newActivity = Activity.update(activity, params);

    return await runInTx(async (txDb) => {
      const txRepo = newActivityRepository(txDb);

      return await txRepo.updateActivity(newActivity);
    });
  };
}

function deleteActivity(repo: ActivityRepository) {
  return async (userId: string, id: string) => {
    const typedUserId = createUserId(userId);
    const typedId = createActivityId(id);

    const activity = await repo.getActivityByIdAndUserId(typedUserId, typedId);
    if (!activity) throw new ResourceNotFoundError("activity not found");

    return await repo.deleteActivity(activity);
  };
}
