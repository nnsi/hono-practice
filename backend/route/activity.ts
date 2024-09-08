import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { JwtEnv } from "../middleware/authMiddleware";
import { activityLogRoute } from "./activityLog";

const factory = createFactory<JwtEnv>();
const app = new Hono();

const getHandler = factory.createHandlers(async (c) => {
  c.json({ message: "Hello" }, 200);
});

const createHandler = factory.createHandlers(async (c) => {
  c.json({ message: "Hello" }, 200);
});

const updateHandler = factory.createHandlers(async (c) => {
  c.json({ message: "Hello" }, 200);
});

const deleteHandler = factory.createHandlers(async (c) => {
  c.json({ message: "Hello" }, 200);
});

export const activityRoute = app
  .get("/", ...getHandler)
  .post("/", ...createHandler)
  .put("/:id", ...updateHandler)
  .delete("/:id", ...deleteHandler)
  .route("/:id/logs", activityLogRoute);
