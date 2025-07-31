/**
 * JWTトークンのデコード（ペイロード部分のみ）
 */
export function decodeJWT(
  token: string,
): { exp?: number; userId?: string } | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * トークンの有効期限までの残り時間（ミリ秒）を計算
 */
export function getTokenExpirationTime(token: string): number | null {
  const decoded = decodeJWT(token);
  if (!decoded?.exp) return null;

  const expirationTime = decoded.exp * 1000; // JWTのexpは秒単位
  const now = Date.now();
  return expirationTime - now;
}

/**
 * トークンリフレッシュのスケジューリング時間を計算
 * デフォルトは有効期限の1分前
 */
export function calculateRefreshTime(
  token: string,
  bufferMinutes = 1,
): number | null {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime || expirationTime <= 0) return null;

  const bufferMs = bufferMinutes * 60 * 1000;
  const refreshTime = expirationTime - bufferMs;

  // 最小でも5秒後にリフレッシュ
  return Math.max(refreshTime, 5000);
}

/**
 * トークンの有効性チェック
 */
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;

  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return false;

  // 1分の余裕を持たせる
  return expirationTime > 60 * 1000;
}

/**
 * 認証エラーの判定
 */
export function isAuthenticationError(error: unknown): boolean {
  if (error instanceof Response) {
    return error.status === 401;
  }
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes("unauthorized") ||
      error.message.toLowerCase().includes("認証")
    );
  }
  return false;
}

/**
 * エラーメッセージの標準化
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Response) {
    switch (error.status) {
      case 401:
        return "ログイン情報が無効です";
      case 403:
        return "アクセスが拒否されました";
      default:
        return `エラーが発生しました (${error.status})`;
    }
  }
  if (error instanceof Error) {
    // 特定のエラーメッセージのマッピング
    if (error.message.includes("Network")) {
      return "ネットワークエラーが発生しました";
    }
    if (error.message.includes("Failed to fetch")) {
      return "サーバーに接続できませんでした";
    }
    return error.message;
  }
  return "不明なエラーが発生しました";
}

/**
 * リフレッシュトークンが必要かどうかの判定
 */
export function shouldRefreshToken(token: string | null): boolean {
  if (!token) return false;

  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return false;

  // 5分以内に期限切れになる場合はリフレッシュ
  return expirationTime <= 5 * 60 * 1000;
}
