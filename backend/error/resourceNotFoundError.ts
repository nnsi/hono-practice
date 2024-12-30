import type { ContentfulStatusCode } from "hono/utils/http-status";

import { AppError } from "./appError";

export class ResourceNotFoundError extends AppError {
  public status: ContentfulStatusCode;

  constructor(message: string, status: ContentfulStatusCode = 404) {
    super(message);
    this.status = status;
  }
}
