import { Hono } from "hono";
import { sign } from "hono/jwt";

import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { googleVerify } from "@backend/feature/auth/googleVerify";

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
    .post("/google", async (c) => {
      const { credential } = await c.req.json<{ credential: string }>();
      if (!credential) {
        throw new AppError("credential is required", 400);
      }

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

      const { JWT_SECRET, JWT_AUDIENCE } = c.env;
      const now = Math.floor(Date.now() / 1000);
      const token = await sign(
        {
          email: payload.email,
          name: payload.name ?? "",
          role: "admin",
          aud: JWT_AUDIENCE,
          iat: now,
          exp: now + ADMIN_TOKEN_EXPIRES_IN_SECONDS,
        },
        JWT_SECRET,
        "HS256",
      );

      return c.json({ token, email: payload.email, name: payload.name ?? "" });
    })
    .post("/dev-login", async (c) => {
      if (c.env.NODE_ENV !== "development") {
        throw new AppError("Not available", 404);
      }

      const { JWT_SECRET, JWT_AUDIENCE } = c.env;
      const now = Math.floor(Date.now() / 1000);
      const email = "dev@localhost";
      const name = "Dev Admin";
      const token = await sign(
        {
          email,
          name,
          role: "admin",
          aud: JWT_AUDIENCE,
          iat: now,
          exp: now + ADMIN_TOKEN_EXPIRES_IN_SECONDS,
        },
        JWT_SECRET,
        "HS256",
      );

      return c.json({ token, email, name });
    });
}

export const adminAuthRoute = createAdminAuthRoute();
