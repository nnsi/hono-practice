import { StatusCode } from "hono/utils/http-status";

export class ResourceNotFoundError extends Error {
  public status: StatusCode;

  constructor(message: string, status: StatusCode = 404) {
    super(message);
    this.status = status;
  }
}
