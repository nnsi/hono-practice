import { Hono } from "hono";

import { AppError, DomainValidateError } from "../error";

import type { AppContext } from "../context";

export function newHonoWithErrorHandling(): Hono<AppContext> {
  const app = new Hono<AppContext>();

  app.onError((err, c) => {
    console.error(err.stack);

    if (err instanceof AppError) {
      return c.json({ message: err.message }, err.status);
    }

    if (err instanceof DomainValidateError) {
      return c.json({ message: err.message }, err.status);
    }

    return c.json({ message: "internal server error" }, 500);
  });

  return app;
}
