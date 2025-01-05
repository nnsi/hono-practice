import { cors } from "hono/cors";

import { serve } from "@hono/node-server";

import { config } from "./config";
import {
  authRoute,
  newActivityLogRoute,
  newActivityRoute,
  taskRoute,
  userRoute,
} from "./feature";
import { newHonoWithErrorHandling } from "./lib/honoWithErrorHandling";
import { authMiddleware } from "./middleware/authMiddleware";

const app = newHonoWithErrorHandling();

app.use(
  "*",
  cors({
    origin: config.APP_URL,
    credentials: true,
  }),
);
app.use("/users/*", authMiddleware);

const routes = app
  .get("/", async (c) => {
    return c.json({ message: "Hello" }, 200);
  })
  .route("/auth", authRoute)
  .route("/user", userRoute)
  .route("/users/tasks", taskRoute)
  .route("/users/activities", newActivityRoute)
  .route("/users/activity-logs", newActivityLogRoute)
  .post("/batch", async (c) => {
    const requests = await c.req.json<{ path: string }[]>();

    const results = await Promise.all(
      requests.map((req) => {
        return app.request(req.path, {
          headers: {
            cookie: c.req.raw.headers.get("cookie") ?? "",
          },
        });
      }),
    );

    const responses = await Promise.all(
      results.map(async (result) => await result.json()),
    );

    return c.json(responses, 200);
  });

const port = 3456;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export type AppType = typeof routes;

export default app;
