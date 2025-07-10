import { AppError } from "./appError";

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
