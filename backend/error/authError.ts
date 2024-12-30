import type { ContentfulStatusCode } from "hono/utils/http-status";

import { AppError } from "./appError";

export class AuthError extends AppError {
  public status: ContentfulStatusCode;

  constructor(message: string, status: ContentfulStatusCode = 401) {
    super(message);
    this.status = status;
  }
}
