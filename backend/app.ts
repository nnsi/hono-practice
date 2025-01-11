import { cors } from "hono/cors";

import {
  authRoute,
  newActivityLogRoute,
  newActivityRoute,
  taskRoute,
  userRoute,
} from "./feature";
import { newHonoWithErrorHandling } from "./lib/honoWithErrorHandling";
import { authMiddleware } from "./middleware/authMiddleware";

export const app = newHonoWithErrorHandling();

app.use("*", async (c, next) => {
  const middleware = cors({
    origin: c.env.APP_URL,
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

export type AppType = typeof routes;

export default app;
