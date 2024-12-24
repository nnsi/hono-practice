import { Activity, createActivityId, createUserId } from "@/backend/domain";
import { ResourceNotFoundError } from "@/backend/error";
import { TransactionRunner } from "@/backend/infra/db";
import { generateOrder } from "@/backend/lib/lexicalOrder";
import { CreateActivityRequest, UpdateActivityRequest } from "@/types/request";

import { ActivityRepository } from ".";

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
  tx: TransactionRunner
): ActivityUsecase {
  return {
    getActivities: getActivities(repo),
    getActivity: getActivity(repo),
    createActivity: createActivity(repo, tx),
    updateActivity: updateActivity(repo, tx),
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

function createActivity(repo: ActivityRepository, tx: TransactionRunner) {
  return async (userId: string, params: CreateActivityRequest) => {
    const typedUserId = createUserId(userId);
    return tx.run([repo], async (txRepo) => {
      const lastOrderIndex =
        await txRepo.getLastOrderIndexByUserId(typedUserId);

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

      return await txRepo.createActivity(activity);
    });
  };
}

function updateActivity(repo: ActivityRepository, tx: TransactionRunner) {
  return async (userId: string, id: string, params: UpdateActivityRequest) => {
    const typedUserId = createUserId(userId);
    const typedId = createActivityId(id);

    return tx.run([repo], async (txRepo) => {
      const activity = await txRepo.getActivityByIdAndUserId(
        typedUserId,
        typedId
      );
      if (!activity) throw new ResourceNotFoundError("activity not found");

      const newActivity = Activity.update(activity, params);

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
