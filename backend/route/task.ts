import { Hono } from "hono";
import { createFactory } from "hono/factory";

import { AppContext } from "../context";
import { newTaskHandler } from "../handler/task";
import { createTaskRepository } from "../repository/drizzle/task";
import { newTaskUsecase } from "../usecase/task";

const factory = createFactory<AppContext>();
const app = new Hono();

export const taskHandler = (function () {
  const uc = newTaskUsecase(createTaskRepository());
  const h = newTaskHandler(uc);

  return app
    .get("/", ...factory.createHandlers(h.getTasks))
    .get("/:id", ...factory.createHandlers(h.getTask))
    .post("/", ...factory.createHandlers(h.createTask))
    .put("/:id", ...factory.createHandlers(h.updateTask))
    .delete("/:id", ...factory.createHandlers(h.deleteTask))
    .delete("/bulkDelete", ...factory.createHandlers(h.bulkDeleteDoneTask));
})();
