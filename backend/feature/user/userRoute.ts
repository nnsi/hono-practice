import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";

import { createUserRequestSchema } from "@/types/request";

import { AppContext } from "../../context";
import { authMiddleware } from "../../middleware/authMiddleware";

import { newUserHandler, newUserUsecase, newUserRepository } from ".";

const factory = createFactory<AppContext>();
const app = new Hono();

const uc = newUserUsecase(newUserRepository());
const h = newUserHandler(uc);

export const userRoute = app
  .post(
    "/",
    ...factory.createHandlers(
      zValidator("json", createUserRequestSchema),
      (c) => h.createUser(c)
    )
  )
  .get("/me", authMiddleware, ...factory.createHandlers(h.getMe));
