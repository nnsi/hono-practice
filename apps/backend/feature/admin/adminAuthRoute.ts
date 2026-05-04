import { Hono } from "hono";
import { sign } from "hono/jwt";

import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { googleVerify } from "@backend/feature/auth/googleVerify";
import { getAdminJwtSecret } from "@backend/utils/adminJwt";
import { isLocalOrigin } from "@backend/utils/isLocalOrigin";
import { zValidator } from "@hono/zod-validator";
import { AdminGoogleAuthRequestSchema } from "@packages/types/request";

const ADMIN_TOKEN_EXPIRES_IN_SECONDS = 8 * 60 * 60;

function parseAllowedEmails(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function createAdminAuthRoute() {
  const app = new Hono<AppContext>();

  return app
    .post(
      "/google",
      zValidator("json", AdminGoogleAuthRequestSchema),
      async (c) => {
        const { credential } = c.req.valid("json");
        const clientIds = [c.env.GOOGLE_OAUTH_CLIENT_ID];
        const payload = await googleVerify(credential, clientIds);

        if (!payload.email || !payload.email_verified) {
          throw new AppError("Email not verified", 403);
        }

        const allowedEmails = parseAllowedEmails(c.env.ADMIN_ALLOWED_EMAILS);
        if (allowedEmails.length === 0) {
          throw new AppError("Admin access not configured", 500);
        }

        if (!allowedEmails.includes(payload.email.toLowerCase())) {
          throw new AppError("Access denied", 403);
        }

        const adminSecret = getAdminJwtSecret(c.env);
        const now = Math.floor(Date.now() / 1000);
        const token = await sign(
          {
            email: payload.email,
            name: payload.name ?? "",
            role: "admin",
            aud: c.env.JWT_AUDIENCE,
            iat: now,
            exp: now + ADMIN_TOKEN_EXPIRES_IN_SECONDS,
          },
          adminSecret,
          "HS256",
        );

        return c.json({
          token,
          email: payload.email,
          name: payload.name ?? "",
        });
      },
    )
    .post("/dev-login", async (c) => {
      if (c.env.NODE_ENV !== "development") {
        throw new AppError("Not available", 404);
      }

      const origin = c.req.header("Origin") ?? "";
      const host = c.req.header("Host") ?? "";
      if (!isLocalOrigin(origin) && !host.startsWith("localhost")) {
        throw new AppError("Not available", 403);
      }

      const adminSecret = getAdminJwtSecret(c.env);
      const now = Math.floor(Date.now() / 1000);
      const email = "dev@localhost";
      const name = "Dev Admin";
      const token = await sign(
        {
          email,
          name,
          role: "admin",
          aud: c.env.JWT_AUDIENCE,
          iat: now,
          exp: now + ADMIN_TOKEN_EXPIRES_IN_SECONDS,
        },
        adminSecret,
        "HS256",
      );

      return c.json({ token, email, name });
    });
}

export const adminAuthRoute = createAdminAuthRoute();
