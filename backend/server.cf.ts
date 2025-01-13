import { Hono } from "hono";

import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/drizzle/schema";

import { app } from "./app";

import type { AppContext } from "./context";

const wApp = new Hono<AppContext>();

wApp.use("*", async (c, next) => {
  const db = drizzle(c.env.DATABASE_URL, { schema });

  c.env.DB = db;

  return next();
});

wApp.route("/", app);

export default wApp;
