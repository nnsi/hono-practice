import { APIError, AuthError, NetworkError, ValidationError } from "./errors";

export async function handleApiError(
  error: unknown,
  _platform?: "web" | "mobile",
): Promise<APIError | NetworkError> {
  // ネットワークエラーの判定
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return new NetworkError("ネットワークエラーが発生しました", error);
  }

  // Responseオブジェクトの場合
  if (error instanceof Response) {
    try {
      const data = await error.json();

      if (error.status === 401) {
        return new AuthError(data.message || "認証エラー", data);
      }

      if (error.status === 400 && data.errors) {
        return new ValidationError(
          data.message || "バリデーションエラー",
          data.errors,
        );
      }

      return new APIError(
        data.message || `HTTPエラー: ${error.status}`,
        error.status,
        data.code,
        data,
      );
    } catch {
      return new APIError(`HTTPエラー: ${error.status}`, error.status);
    }
  }

  // その他のエラー
  if (error instanceof Error) {
    return new APIError(error.message, 500, "UNKNOWN_ERROR");
  }

  return new APIError("不明なエラーが発生しました", 500, "UNKNOWN_ERROR");
}

export function isNetworkError(error: unknown): boolean {
  return (
    error instanceof NetworkError ||
    (error instanceof TypeError && error.message.includes("fetch"))
  );
}

export function isAuthError(error: unknown): boolean {
  return (
    error instanceof AuthError ||
    (error instanceof APIError && error.statusCode === 401)
  );
}

export function isValidationError(error: unknown): boolean {
  return (
    error instanceof ValidationError ||
    (error instanceof APIError && error.statusCode === 400)
  );
}

// エラーメッセージの標準化
export function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "不明なエラーが発生しました";
}

// エラーレスポンスからのエラー抽出
export async function extractErrorFromResponse(
  response: Response,
): Promise<APIError> {
  try {
    const data = await response.json();

    if (response.status === 400 && data.errors) {
      return new ValidationError(
        data.message || "Validation failed",
        data.errors,
      );
    }

    if (response.status === 401) {
      return new AuthError(data.message || "Unauthorized", data);
    }

    return new APIError(
      data.message || `HTTP ${response.status}`,
      response.status,
      data.code,
      data,
    );
  } catch {
    return new APIError(`HTTP ${response.status}`, response.status);
  }
}
