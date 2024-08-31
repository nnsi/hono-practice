import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { helloRoute, authRoute } from "./route";
import { cors } from "hono/cors";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { PrismaClient } from "@prisma/client";
import { type User } from "@/types/prisma"

const app = new Hono();

app.use("*", cors());
app.use("/users/*", async (c, next) => {
  const jwt = getCookie(c, "auth");

  if (!jwt) {
    return c.json({ message: "unauthorized" }, 401);
  }
  try {
    const payload = await verify(jwt, "secret123");
    c.set("jwtPayload", payload);

  } catch (e) {
    return c.json({ message: "unauthorized" }, 401);
  }

  await next();
});

const routes = app
  .route("/", helloRoute)
  .route("/auth", authRoute)
  .get("/users/me", async (c) => {
    const payload = c.get("jwtPayload") as { user: User };
    const prisma = new PrismaClient();

    const user = await prisma.user.findFirst({
      where: {
        id: payload.user.id,
      },
    });

    const { password, ...userWithoutPassword } = user || {};

    return c.json({ ...userWithoutPassword }, 200);
  })

const port = 3456;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export type AppType = typeof routes;
