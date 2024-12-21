import { Hono } from "hono";

import { zValidator } from "@hono/zod-validator";

import { drizzle } from "@/backend/infra/drizzle/drizzleInstance";
import { loginRequestSchema } from "@/types/request";

import { AppContext } from "../../context";
import { newUserRepository } from "../user";

import { newAuthHandler, newAuthUsecase } from ".";

const app = new Hono<AppContext>();

const repo = newUserRepository(drizzle);
const uc = newAuthUsecase(repo);
const h = newAuthHandler(uc);

export const authRoute = app
  .post(
    "/login",
    zValidator("json", loginRequestSchema),
     (c) =>{
      const params = c.req.valid("json");
      return h.login(c, params);
    })
  .get("/logout", (c)=> h.logout(c));
