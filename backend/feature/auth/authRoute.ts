import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";

import { drizzle } from "@/backend/infra/drizzle/drizzleInstance";
import { loginRequestSchema } from "@/types/request";

import { AppContext } from "../../context";
import { newUserRepository, newUserUsecase } from "../user";

import { newAuthHandler } from ".";

const factory = createFactory<AppContext>();
const app = new Hono();

const userRepo = newUserRepository(drizzle);
const userUsecase = newUserUsecase(userRepo);

const h = newAuthHandler(userUsecase);

export const authRoute = app
  .post(
    "/login",
    ...factory.createHandlers(zValidator("json", loginRequestSchema), (c) =>
      h.login(c)
    )
  )
  .get("/logout", ...factory.createHandlers((c) => h.logout(c)));
