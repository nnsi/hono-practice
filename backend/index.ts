import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { authRoute, taskRoute } from "./route";
import { cors } from "hono/cors";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "./middleware/authMiddleware";
import { config } from "./config";

const prisma = new PrismaClient().$extends({
  query: {
    $allOperations({ model, operation, args, query }) {
      console.log("model:" + model, "operation:" + operation);
      console.log(args);
      return query(args);
    },
  },
});
const app = new Hono<{ Variables: { prisma: typeof prisma } }>();

app.use(
  "*",
  cors({
    origin: config.APP_URL,
    credentials: true,
  }),
  async (c, next) => {
    c.set("prisma", prisma);
    await next();
  }
);
app.use("/users/*", authMiddleware);

const routes = app
  .get("/", async (c) => {
    return c.json({ message: "Hello" }, 200);
  })
  .route("/auth", authRoute)
  .route("/users/tasks", taskRoute)
  .get("/users/me", async (c) => {
    const payload = c.get("jwtPayload");
    const prisma = c.get("prisma");

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

    const { password, loginId, ...userWithoutPassword } = user;

    return c.json({ ...userWithoutPassword }, 200);
  });

const port = 3456;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export type AppType = typeof routes;
