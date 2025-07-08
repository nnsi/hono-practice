import { Hono } from "hono";

import { createTaskRoute } from "@backend/feature/task/taskRoute";

const app = new Hono();

// 既存のTaskルートを再利用
const taskRoute = createTaskRoute();
app.route("/", taskRoute);

export const tasksV1Route = app;
