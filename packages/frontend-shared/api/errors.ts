// 共通エラー型定義

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class AuthError extends APIError {
  constructor(message: string, details?: unknown) {
    super(message, 401, "AUTH_ERROR", details);
    this.name = "AuthError";
  }
}

export class ValidationError extends APIError {
  constructor(
    message: string,
    public errors: Record<string, string[]>,
  ) {
    super(message, 400, "VALIDATION_ERROR", errors);
    this.name = "ValidationError";
  }
}
