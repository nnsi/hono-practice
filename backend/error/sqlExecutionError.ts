import { StatusCode } from "hono/utils/http-status";

export class SqlExecutionError extends Error {
  public status: StatusCode;

  constructor(message: string, status: StatusCode = 500) {
    super(message);
    this.status = status;
  }
}
