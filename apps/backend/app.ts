import { cors } from "hono/cors";

import {
  authRoute,
  newActivityLogRoute,
  newActivityRoute,
  newSyncRoute,
  taskRoute,
  userRoute,
} from "./feature";
import { goalRoute } from "./feature/goal/goalRoute";
import { newHonoWithErrorHandling } from "./lib/honoWithErrorHandling";
import { authMiddleware } from "./middleware/authMiddleware";

export const app = newHonoWithErrorHandling();

app.use("*", async (c, next) => {
  const headerOrigin = c.req.header("Origin") ?? "";

  const origin = headerOrigin.includes(c.env.APP_URL)
    ? headerOrigin
    : c.env.APP_URL;

  const middleware = cors({
    origin,
    credentials: true,
  });

  return middleware(c, next);
});
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
  .route("/users/goals", goalRoute)
  .route("/users/sync", newSyncRoute)
  .post("/batch", authMiddleware, async (c) => {
    const requests = await c.req.json<{ path: string }[]>();

    const results = await Promise.all(
      requests.map((req) => {
        return app.request(
          req.path,
          {
            method: "GET",
            headers: c.req.raw.headers,
          },
          {
            ...c.env,
          },
        );
      }),
    );

    const responses = await Promise.all(
      results.map(async (result) => await result.json()),
    );

    return c.json(responses, 200);
  });

export type AppType = typeof routes;

export default app;
