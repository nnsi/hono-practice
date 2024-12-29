import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AuthError extends Error {
  public status: ContentfulStatusCode;

  constructor(message: string, status: ContentfulStatusCode = 401) {
    super(message);
    this.status = status;
  }
}
