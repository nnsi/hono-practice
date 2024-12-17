import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";

import { drizzle, newAppGateway } from "@/backend/infra/drizzle";
import { createUserRequestSchema } from "@/types/request";

import { AppContext } from "../../context";
import { authMiddleware } from "../../middleware/authMiddleware";

import { newUserHandler, newUserUsecase } from ".";

const factory = createFactory<AppContext>();
const app = new Hono();

const gateway = newAppGateway(drizzle);
const uc = newUserUsecase(gateway);
const h = newUserHandler(uc);

export const userRoute = app
  .post(
    "/",
    ...factory.createHandlers(
      zValidator("json", createUserRequestSchema),
      (c) => h.createUser(c)
    )
  )
  .get("/dashboard", authMiddleware, ...factory.createHandlers(h.getDashboard))
  .get("/me", authMiddleware, ...factory.createHandlers(h.getMe));
