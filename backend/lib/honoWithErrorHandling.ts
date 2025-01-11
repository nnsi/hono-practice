import { Hono } from "hono";

import { AppError, DomainValidateError } from "../error";

import type { SafeEnvs } from "../config";

export function newHonoWithErrorHandling(): Hono<{ Bindings: SafeEnvs }> {
  const app = new Hono<{ Bindings: SafeEnvs }>();

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
