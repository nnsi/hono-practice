import { Context, Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { drizzle, runInTx } from "@/backend/infra/drizzle";
import { newActivityQueryService } from "@/backend/query";
import { createUserRequestSchema } from "@/types/request";

import { AppContext } from "../../context";
import { authMiddleware } from "../../middleware/authMiddleware";
import { newTaskRepository } from "../task";

import { newUserHandler, newUserRepository, newUserUsecase } from ".";

const app = new Hono<AppContext>();

const repo = newUserRepository(drizzle);
const uc = newUserUsecase(repo);
const h = newUserHandler(uc);

export type WithTransactionRepositoryContext = Context<
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
  .get(
    "/dashboard",
    authMiddleware,
    async (c: WithTransactionRepositoryContext) => {
      const [txUserRepo, txTaskRepo, txActivityQS] = await runInTx(
        async (txDb) => {
          return [
            newUserRepository(txDb),
            newTaskRepository(txDb),
            newActivityQueryService(txDb),
          ];
        }
      );
      c.set("txUserRepo", txUserRepo);
      c.set("txTaskRepo", txTaskRepo);
      c.set("txActivityQS", txActivityQS);

      return h.getDashboard(c);
    }
  );
