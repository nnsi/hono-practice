import { Hono } from "hono";
import { createFactory } from "hono/factory";

const factory = createFactory();
const app = new Hono();

const getHandler = factory.createHandlers(async (c) => {
  return c.json({ message: "Hello Hono!?" }, 200);
});

const route = app.get("/", ...getHandler).get("/hello", (c) => {
  return c.json({ message: "HonoHonoHono!" }, 200);
});

export { route as helloRoute };
