import type { ContentfulStatusCode } from "hono/utils/http-status";

export class ResourceNotFoundError extends Error {
  public status: ContentfulStatusCode;

  constructor(message: string, status: ContentfulStatusCode = 404) {
    super(message);
    this.status = status;
  }
}
