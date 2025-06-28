import { AppError } from "./appError";

export class UnexpectedError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 500);
    this.name = "UnexpectedError";
    if (cause) {
      this.cause = cause;
    }
  }
}
