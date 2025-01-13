import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/drizzle/schema";

import { app } from "./app";

app.use("*", async (c, next) => {
  const db = drizzle(c.env.DATABASE_URL, { schema });

  c.env.DB = db;

  return next();
});

export default app;
