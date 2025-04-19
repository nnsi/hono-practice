import { AppError } from "./appError";

export class UnauthorizedError extends AppError {
  public status: 401;

  constructor(message: string) {
    super(message);
    this.status = 401;
  }
}
