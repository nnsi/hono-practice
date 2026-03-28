import { Hono } from "hono";
import { sign } from "hono/jwt";

import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { googleVerify } from "@backend/feature/auth/googleVerify";
import { newContactRepository } from "@backend/feature/contact/contactRepository";
import { newContactUsecase } from "@backend/feature/contact/contactUsecase";
import { newUserRepository } from "@backend/feature/user/userRepository";
import { noopTracer } from "@backend/lib/tracer";
import { adminAuthMiddleware } from "@backend/middleware/adminAuthMiddleware";
import { newAdminDashboardQueryService } from "@backend/query/adminDashboardQueryService";
import {
  createMockApmProvider,
  getNullApmProvider,
} from "@backend/query/apmProvider";

import { newAdminDashboardUsecase } from "./adminDashboardUsecase";
import { type AdminHandler, newAdminHandler } from "./adminHandler";
import { newAdminUserUsecase } from "./adminUserUsecase";
import { createWaeApmProvider } from "./waeQuery";

const ADMIN_TOKEN_EXPIRES_IN_SECONDS = 8 * 60 * 60;

type AdminRouteContext = AppContext & {
  Variables: AppContext["Variables"] & {
    adminHandler: AdminHandler;
  };
};

function parseAllowedEmails(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function createAdminRoute() {
  const app = new Hono<AdminRouteContext>();

  // --- Auth endpoints (no adminAuthMiddleware) ---
  app.post("/auth/google", async (c) => {
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
  });

  app.post("/auth/dev-login", async (c) => {
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

  // --- Protected routes: auth + DI ---
  app.use("/dashboard", adminAuthMiddleware);
  app.use("/users", adminAuthMiddleware);
  app.use("/contacts/*", adminAuthMiddleware);
  app.use("/contacts", adminAuthMiddleware);

  app.use("/*", async (c, next) => {
    // Skip DI for auth routes
    if (c.req.path.startsWith("/admin/auth")) {
      return next();
    }
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;
    const userRepo = newUserRepository(db);
    const contactRepo = newContactRepository(db);
    const userUc = newAdminUserUsecase(userRepo, tracer);
    const contactUc = newContactUsecase(contactRepo, tracer);
    const isDev = c.env.NODE_ENV === "development";
    const apmProvider = c.env.CF_API_TOKEN
      ? createWaeApmProvider(c.env.CF_API_TOKEN)
      : isDev
        ? createMockApmProvider()
        : getNullApmProvider();
    const dashboardQs = newAdminDashboardQueryService(db, apmProvider);
    const dashboardUc = newAdminDashboardUsecase(dashboardQs, tracer);
    c.set("adminHandler", newAdminHandler(userUc, contactUc, dashboardUc));
    return next();
  });

  // --- Endpoints ---
  app.get("/dashboard", async (c) => {
    const data = await c.var.adminHandler.getDashboard();
    return c.json(data);
  });

  app.get("/users", async (c) => {
    const limit = Number(c.req.query("limit") ?? "20");
    const offset = Number(c.req.query("offset") ?? "0");
    const result = await c.var.adminHandler.listUsers(limit, offset);
    return c.json(result);
  });

  app.get("/contacts", async (c) => {
    const limit = Number(c.req.query("limit") ?? "20");
    const offset = Number(c.req.query("offset") ?? "0");
    const result = await c.var.adminHandler.listContacts(limit, offset);
    return c.json(result);
  });

  app.get("/contacts/:id", async (c) => {
    const { id } = c.req.param();
    const contact = await c.var.adminHandler.getContactById(id);
    if (!contact) {
      throw new AppError("Contact not found", 404);
    }
    return c.json(contact);
  });

  return app;
}

export const adminRoute = createAdminRoute();
