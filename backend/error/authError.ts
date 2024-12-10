import { StatusCode } from "hono/utils/http-status";

export class AuthError extends Error {
  public status: StatusCode;

  constructor(message: string, status: StatusCode = 401) {
    super(message);
    this.status = status;
  }
}
