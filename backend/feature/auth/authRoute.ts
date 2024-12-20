import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";

import { newAppGateway } from "@/backend/infra/drizzle";
import { drizzle } from "@/backend/infra/drizzle/drizzleInstance";
import { loginRequestSchema } from "@/types/request";

import { AppContext } from "../../context";
import { newUserUsecase } from "../user";

import { newAuthHandler, newAuthUsecase } from ".";

const factory = createFactory<AppContext>();
const app = new Hono();

const gateway = newAppGateway(drizzle);
const authUsecase = newAuthUsecase();
const userUsecase = newUserUsecase(gateway);

const h = newAuthHandler(authUsecase, userUsecase);

export const authRoute = app
  .post(
    "/login",
    ...factory.createHandlers(zValidator("json", loginRequestSchema), (c) =>
      h.login(c)
    )
  )
  .get("/logout", ...factory.createHandlers((c) => h.logout(c)));
