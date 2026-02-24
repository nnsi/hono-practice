import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import { apiV1Route } from "./api/v1";
import { AppError } from "./error";
import {
  apiKeyRoute,
  authRoute,
  newActivityLogRoute,
  newActivityRoute,
  taskRoute,
  userRoute,
} from "./feature";
import {
  activityLogV2Route,
  activityV2Route,
  goalV2Route,
  taskV2Route,
} from "./feature-v2";
import { goalRoute } from "./feature/goal/goalRoute";
import { r2ProxyRoute } from "./feature/r2proxy/r2ProxyRoute";
import { subscriptionRoute } from "./feature/subscription/subscriptionRoute";
import { newHonoWithErrorHandling } from "./lib/honoWithErrorHandling";
import type { TracerSummary } from "./lib/tracer";
import { authMiddleware } from "./middleware/authMiddleware";
import { loggerMiddleware } from "./middleware/loggerMiddleware";

export const app = newHonoWithErrorHandling();

app.use("*", loggerMiddleware());
app.use("*", secureHeaders());

app.use("*", async (c, next) => {
  const headerOrigin = c.req.header("Origin") ?? "";

  // 開発環境でのモバイルアプリからのアクセスを許可
  const allowedOrigins = [c.env.APP_URL];
  if (c.env.APP_URL_V2) allowedOrigins.push(c.env.APP_URL_V2);

  if (c.env.NODE_ENV === "development" || c.env.NODE_ENV === "test") {
    // ローカル開発環境のポート
    allowedOrigins.push(
      "http://localhost:5176",
      "http://localhost:5177", // E2Eテスト用追加ポート
      "http://localhost:8081",
      "http://localhost:8082",
      "http://localhost:19006", // Expo Web
      "http://localhost:2460", // frontend-v2
      "http://localhost:2461", // frontend-v2 fallback port
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

  const origin = allowedOrigins.includes(headerOrigin)
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
  .route("/users/api-keys", apiKeyRoute)
  .route("/users/subscription", subscriptionRoute)
  .route("/users/v2", activityLogV2Route)
  .route("/users/v2", activityV2Route)
  .route("/users/v2", goalV2Route)
  .route("/users/v2", taskV2Route)
  .route("/api/v1", apiV1Route)
  .route("/r2", r2ProxyRoute)
  .post("/batch", authMiddleware, async (c) => {
    const requests = await c.req.json<{ path: string }[]>();

    if (requests.length > 5) {
      throw new AppError("Too many batch requests (max 5)", 400);
    }

    for (const req of requests) {
      // クエリストリングを除いたパスを取得
      const path = req.path.split("?")[0];

      // パストラバーサル検出（.. や URLエンコードされた %2e/%2E）
      if (path.includes("..") || path.toLowerCase().includes("%2e")) {
        throw new AppError("Invalid path: path traversal detected", 400);
      }

      if (!path.startsWith("/users/")) {
        throw new AppError("Invalid batch request path", 400);
      }
    }

    const userId = c.get("userId");
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
            __authenticatedUserId: userId,
          },
        );
      }),
    );

    // サブリクエストのトレーサーサマリーを親トレーサーに集約（観測性改善）
    const tracer = c.get("tracer");
    for (const result of results) {
      const summaryHeader = result.headers.get("X-Tracer-Summary");
      if (summaryHeader) {
        const sub = JSON.parse(summaryHeader) as TracerSummary;
        if (sub.dbMs) tracer.addSpan("db.batch-sub", sub.dbMs);
        if (sub.r2Ms) tracer.addSpan("r2.batch-sub", sub.r2Ms);
        if (sub.kvMs) tracer.addSpan("kv.batch-sub", sub.kvMs);
        if (sub.extMs) tracer.addSpan("ext.batch-sub", sub.extMs);
      }
    }

    const responses = await Promise.all(
      results.map(async (result) => await result.json()),
    );

    return c.json(responses, 200);
  });

export type AppType = typeof routes;

export default app;
