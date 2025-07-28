import { cors } from "hono/cors";

import { apiV1Route } from "./api/v1";
import {
  apiKeyRoute,
  authRoute,
  newActivityLogRoute,
  newActivityRoute,
  newSyncRoute,
  taskRoute,
  userRoute,
} from "./feature";
import { goalRoute } from "./feature/goal/goalRoute";
import { subscriptionRoute } from "./feature/subscription/subscriptionRoute";
import { newHonoWithErrorHandling } from "./lib/honoWithErrorHandling";
import { authMiddleware } from "./middleware/authMiddleware";

export const app = newHonoWithErrorHandling();

app.use("*", async (c, next) => {
  const headerOrigin = c.req.header("Origin") ?? "";

  // 開発環境でのモバイルアプリからのアクセスを許可
  const allowedOrigins = [c.env.APP_URL];

  if (c.env.NODE_ENV === "development" || c.env.NODE_ENV === "test") {
    // ローカル開発環境のポート
    allowedOrigins.push(
      "http://localhost:5176",
      "http://localhost:8081",
      "http://localhost:8082",
      "http://localhost:19006", // Expo Web
    );

    // 実機からのアクセス用（同一ネットワーク内のIPアドレス）
    // 192.168.x.x や 10.x.x.x からのアクセスを許可
    const isLocalNetwork = headerOrigin.match(
      /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/,
    );
    if (isLocalNetwork) {
      allowedOrigins.push(headerOrigin);
    }
  }

  const origin = allowedOrigins.some((allowed) =>
    headerOrigin.includes(allowed),
  )
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
  .route("/users/api-keys", apiKeyRoute)
  .route("/users/subscription", subscriptionRoute)
  .route("/api/v1", apiV1Route)
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
