import { StatusCode } from "hono/utils/http-status";

export class AppError extends Error {
  public status: StatusCode;

  constructor(message: string, status: StatusCode) {
    super(message);
    this.status = status;
  }
}
