import type { ContentfulStatusCode } from "hono/utils/http-status";

export class DomainValidateError extends Error {
  public status: ContentfulStatusCode;

  constructor(message: string, status: ContentfulStatusCode = 400) {
    super(message);
    this.status = status;
  }
}
