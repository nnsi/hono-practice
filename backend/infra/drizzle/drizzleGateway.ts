import {
  newTaskRepository,
  newUserRepository,
  TaskRepository,
  UserRepository,
} from "@/backend/feature";
import { ActivityQueryService, newActivityQueryService } from "@/backend/query";

import { DrizzleInstance } from "./drizzleInstance";

export type Repositories = TaskRepository & UserRepository;

export type QueryServices = ActivityQueryService;

export type AppGateway = Repositories &
  QueryServices & {
    runInTx<T>(fn: (tx: AppGateway) => Promise<T>): Promise<T>;
  };

export function newAppGateway(db: DrizzleInstance): AppGateway {
  const userRepo = newUserRepository(db);
  const taskRepo = newTaskRepository(db);

  const activityQS = newActivityQueryService(db);

  return {
    ...userRepo,
    ...taskRepo,
    ...activityQS,
    runInTx: async (fn) => {
      return await fn(newAppGateway(db));
    },
  };
}
