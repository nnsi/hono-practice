import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { adminAuthMiddleware } from "@backend/middleware/adminAuthMiddleware";

import { resolveAdminHandler } from "./adminDi";
import type { AdminHandler } from "./adminHandler";

type AdminRouteContext = AppContext & {
  Variables: AppContext["Variables"] & {
    adminHandler: AdminHandler;
  };
};

function parsePaginationParam(
  raw: string | undefined,
  defaultValue: number,
  max: number,
): number {
  const n = Number(raw ?? defaultValue);
  if (!Number.isFinite(n) || n < 0) return defaultValue;
  return Math.min(Math.floor(n), max);
}

function createAdminRoute() {
  const app = new Hono<AdminRouteContext>();

  app.use("*", adminAuthMiddleware);
  app.use("*", async (c, next) => {
    c.set("adminHandler", resolveAdminHandler(c));
    return next();
  });

  return app
    .get("/dashboard", async (c) => {
      const data = await c.var.adminHandler.getDashboard();
      return c.json(data);
    })
    .get("/users", async (c) => {
      const limit = parsePaginationParam(c.req.query("limit"), 20, 100);
      const offset = parsePaginationParam(c.req.query("offset"), 0, 10000);
      const result = await c.var.adminHandler.listUsers(limit, offset);
      return c.json(result);
    })
    .get("/contacts", async (c) => {
      const limit = parsePaginationParam(c.req.query("limit"), 20, 100);
      const offset = parsePaginationParam(c.req.query("offset"), 0, 10000);
      const result = await c.var.adminHandler.listContacts(limit, offset);
      return c.json(result);
    })
    .get("/contacts/:id", async (c) => {
      const { id } = c.req.param();
      const contact = await c.var.adminHandler.getContactById(id);
      if (!contact) {
        throw new AppError("Contact not found", 404);
      }
      return c.json(contact);
    })
    .get("/client-errors/:platform", async (c) => {
      const { platform } = c.req.param();
      const details = await c.var.adminHandler.getClientErrorDetails(platform);
      return c.json(details);
    })
    .get("/api-errors/:kind", async (c) => {
      const { kind } = c.req.param();
      if (kind !== "5xx" && kind !== "400") {
        throw new AppError("Invalid error kind", 400);
      }
      const details = await c.var.adminHandler.getApiErrorDetails(kind);
      return c.json(details);
    });
}

export const adminRoute = createAdminRoute();
