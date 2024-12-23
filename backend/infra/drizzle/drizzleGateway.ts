import {
  ActivityRepository,
  newActivityRepository,
  newTaskRepository,
  newUserRepository,
  TaskRepository,
  UserRepository,
} from "@/backend/feature";
import { ActivityQueryService, newActivityQueryService } from "@/backend/query";

import { QueryExecutor } from "../db";

import { DrizzleInstance } from "./drizzleInstance";

export type Repositories = TaskRepository & UserRepository & ActivityRepository;

export type QueryServices = ActivityQueryService;

export type AppGateway = Repositories &
  QueryServices & {
    runInTx<T>(fn: (tx: AppGateway) => Promise<T>): Promise<T>;
  } & ReturnType<typeof repositoryInstances>;

function repositoryInstances(qe: QueryExecutor) {
  return {
    ...newTaskRepository(qe),
    ...newUserRepository(qe),
    ...newActivityRepository(qe),
    ...newActivityQueryService(qe),
  };
}

export function newAppGateway(db: DrizzleInstance): AppGateway {
  const repositories = repositoryInstances(db);

  return {
    ...repositories,
    runInTx: async <T>(fn: (txGw: AppGateway) => Promise<T>): Promise<T> => {
      return db.transaction(async (txDb) => {
        const txRepositories = repositoryInstances(txDb);

        const txAppGateway: AppGateway = {
          ...txRepositories,
          runInTx: async () => {
            throw new Error("transaction in transaction is not supported");
          },
        };

        return fn(txAppGateway);
      });
    },
  };
}
