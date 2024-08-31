import { Hono } from "hono";
import { createFactory } from "hono/factory";

const factory = createFactory();
const app = new Hono();

const getHandler = factory.createHandlers(async (c) => {
  return c.json({ message: "Hello Hoge!?" });
});

const route = app.get("/", ...getHandler);

export { route as hogeRoute };
