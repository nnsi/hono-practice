import { Hono } from "hono";
import { cors } from "hono/cors";

import { serve } from "@hono/node-server";

import { config } from "./config";
import {
  AppError,
  AuthError,
  ResourceNotFoundError,
  SqlExecutionError,
} from "./error";
import {
  authRoute,
  taskRoute,
  userRoute,
  activityRoute,
  activityDateLogRoute,
  newActivityRoute,
} from "./feature";
import { authMiddleware } from "./middleware/authMiddleware";

const app = new Hono();
app.onError((err, c) => {
  console.error(err.stack);

  if (
    err instanceof AppError ||
    err instanceof AuthError ||
    err instanceof ResourceNotFoundError ||
    err instanceof SqlExecutionError
  ) {
    return c.json({ message: err.message }, err.status);
  }

  return c.json({ message: "internal server error" }, 500);
});

app.use(
  "*",
  cors({
    origin: config.APP_URL,
    credentials: true,
  })
);
app.use("/users/*", authMiddleware);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = app
  .get("/", async (c) => {
    return c.json({ message: "Hello" }, 200);
  })
  .route("/auth", authRoute)
  .route("/user", userRoute)
  .route("/users/tasks", taskRoute)
  .route("/users/activities", activityRoute)
  .route("/users/new-activities", newActivityRoute)
  .route("/users/activity-logs", activityDateLogRoute);

const port = 3456;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export type AppType = typeof routes;

export default app;
