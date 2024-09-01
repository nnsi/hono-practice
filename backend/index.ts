import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { helloRoute, authRoute, taskRoute } from "./route";
import { cors } from "hono/cors";
import { PrismaClient } from "@prisma/client";
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
  .route("/", helloRoute)
  .route("/auth", authRoute)
  .route("/users/tasks", taskRoute)
  .get("/users/me", async (c) => {
    const payload = c.get("jwtPayload");
    const prisma = new PrismaClient();

    if (!payload.id) {
      return c.json({ message: "unauthorized" }, 401);
    }

    const user = await prisma.user.findFirst({
      where: {
        id: payload.id,
      },
    });

    if (!user) {
      return c.json({ message: "unauthorized" }, 401);
    }

    const { password, login_id, ...userWithoutPassword } = user;

    return c.json({ ...userWithoutPassword }, 200);
  });

const port = 3456;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export type AppType = typeof routes;
