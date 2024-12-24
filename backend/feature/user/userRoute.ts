import { Context, Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { drizzle, newDrizzleTransactionRunner } from "@/backend/infra/drizzle";
import { newActivityQueryService } from "@/backend/query";
import { createUserRequestSchema } from "@/types/request";

import { AppContext } from "../../context";
import { authMiddleware } from "../../middleware/authMiddleware";
import { newTaskRepository } from "../task";

import { newUserHandler, newUserRepository, newUserUsecase } from ".";

const app = new Hono<AppContext>();

const tx = newDrizzleTransactionRunner(drizzle);
const repo = newUserRepository(drizzle);
const taskRepo = newTaskRepository(drizzle);
const activityQS = newActivityQueryService(drizzle);
const uc = newUserUsecase(tx, repo, taskRepo, activityQS);
const h = newUserHandler(uc);

export type WithTxDashboardRepositoriesContext = Context<
  AppContext & {
    Variables: {
      txUserRepo: ReturnType<typeof newUserRepository>;
      txTaskRepo: ReturnType<typeof newTaskRepository>;
      txActivityQS: ReturnType<typeof newActivityQueryService>;
    };
  },
  any,
  {}
>;

export const userRoute = app
  .post("/", zValidator("json", createUserRequestSchema), (c) =>
    h.createUser(c)
  )
  .get("/me", authMiddleware, (c) => h.getMe(c))
  .get("/dashboard", authMiddleware, async (c) => h.getDashboard(c));
