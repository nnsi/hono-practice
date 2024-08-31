import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { helloRoute, hogeRoute } from "./route";
import { cors } from "hono/cors";

const app = new Hono();

app.use("*", cors());
app.use("*", async (c, next) => {
  console.log("api middleware:", c.req.param(), c.req.queries());
  await next();
});

const routes = app.route("/", helloRoute).route("/hoge", hogeRoute);

const port = 3456;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export type AppType = typeof routes;
