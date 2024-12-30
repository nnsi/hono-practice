import { Hono } from "hono";

import { AppError, DomainValidateError } from "../error";

export function newHonoWithErrorHandling(): Hono {
  const app = new Hono();
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
