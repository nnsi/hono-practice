import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { activityRoute, authRoute, taskRoute } from "./route";
import { cors } from "hono/cors";
import { prisma } from "./lib/prisma";
import { authMiddleware } from "./middleware/authMiddleware";
import { config } from "./config";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: config.APP_URL,
    credentials: true,
  })
);
app.use("/users/*", authMiddleware);

const routes = app
  .get("/", async (c) => {
    return c.json({ message: "Hello" }, 200);
  })
  .route("/auth", authRoute)
  .route("/users/tasks", taskRoute)
  .route("/users/activities", activityRoute)
  .get("/users/me", async (c) => {
    const payload = c.get("jwtPayload");

    if (!payload.id) {
      return c.json({ message: "unauthorized" }, 401);
    }

    const user = await prisma.user.findFirst({
      select: {
        id: true,
        name: true,
      },
      where: {
        id: payload.id,
      },
    });

    if (!user) {
      return c.json({ message: "unauthorized" }, 401);
    }

    return c.json({ ...user }, 200);
  });

const port = 3456;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export type AppType = typeof routes;
