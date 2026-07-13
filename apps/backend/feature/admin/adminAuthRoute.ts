import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { zValidator } from "@hono/zod-validator";
import { AdminGoogleAuthRequestSchema } from "@packages/types/request";

import { assertAdminOrigin } from "./adminAccessPolicy";
import {
  type AdminAuthDependencies,
  resolveAdminAuthHandler,
} from "./adminAuthDi";
import type { AdminAuthHandler } from "./adminAuthHandler";
import {
  clearAdminSessionCookie,
  getAdminSessionToken,
  setAdminSessionCookie,
} from "./adminSessionCookie";

export function createAdminAuthRoute(deps: AdminAuthDependencies = {}) {
  const app = new Hono<
    AppContext & {
      Variables: {
        adminAuthHandler: AdminAuthHandler;
      };
    }
  >();

  app.use("*", async (c, next) => {
    assertAdminOrigin(c.req.header("Origin"), c.env);
    c.set("adminAuthHandler", resolveAdminAuthHandler(c.env, deps));
    return next();
  });

  return app
    .post(
      "/google",
      zValidator("json", AdminGoogleAuthRequestSchema),
      async (c) => {
        const { credential } = c.req.valid("json");
        const result = await c.var.adminAuthHandler.googleLogin(credential);
        setAdminSessionCookie(c, result.token, result.expiresAt);
        return c.json({ email: result.email, name: result.name });
      },
    )
    .post("/dev-login", async (c) => {
      const origin = c.req.header("Origin") ?? "";
      const host = c.req.header("Host") ?? "";
      const result = await c.var.adminAuthHandler.devLogin(origin, host);
      setAdminSessionCookie(c, result.token, result.expiresAt);
      return c.json({ email: result.email, name: result.name });
    })
    .get("/session", async (c) => {
      const token = getAdminSessionToken(c);
      const session = await c.var.adminAuthHandler
        .getSession(token)
        .catch((error) => {
          if (token) clearAdminSessionCookie(c);
          throw error;
        });
      return c.json({ email: session.email, name: session.name });
    })
    .post("/logout", async (c) => {
      const token = getAdminSessionToken(c);
      await c.var.adminAuthHandler.logout(token);
      clearAdminSessionCookie(c);
      return c.json({ ok: true });
    });
}

export const adminAuthRoute = createAdminAuthRoute();
