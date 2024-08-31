import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { helloRoute, hogeRoute, authRoute } from "./route";
import { cors } from "hono/cors";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";

const app = new Hono();

app.use("*", cors());
app.use("/users/*", async (c, next) => {
  const jwt = getCookie(c, "auth");

  if (!jwt) {
    return c.json({ message: "unauthorized" }, 401);
  }
  try {
    await verify(jwt, "secret123");
    console.log("verified");
  } catch (e) {
    return c.json({ message: "unauthorized" }, 401);
  }

  await next();
});

const routes = app
  .route("/", helloRoute)
  .route("/hoge", hogeRoute)
  .route("/auth", authRoute);

const port = 3456;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export type AppType = typeof routes;
