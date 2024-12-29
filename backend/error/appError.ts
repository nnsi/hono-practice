import { ContentfulStatusCode } from "hono/utils/http-status";

export class AppError extends Error {
  public status: ContentfulStatusCode;

  constructor(message: string, status: ContentfulStatusCode = 500) {
    super(message);
    this.status = status;
  }
}
