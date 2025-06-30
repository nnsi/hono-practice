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
