import { z } from "zod";

// iconUrl は同期 API 経由でクライアントが自由に書けるため、サーバーが
// ストレージ key を復元する際にディレクトリ外へ出る `..` や、ブラウザが
// スクリプトとして扱う scheme を保存させない。
// 正当な値はサーバーが返す http(s) URL (`${apiBaseUrl}/r2/<key>` /
// `${APP_URL}/public/uploads/<key>`) と、クライアント側で生成する data:image URL。
// `//host/...` (プロトコル相対) はブラウザが外部ホストとして解決するため許可しない。
const ALLOWED_SCHEME_PATTERN = /^(https?:\/\/|data:image\/|\/(?!\/))/i;

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function isSafeIconUrl(value: string): boolean {
  if (value.includes("\\")) return false;
  if (!ALLOWED_SCHEME_PATTERN.test(value)) return false;
  if (value.startsWith("data:")) return true;
  const pathPart = value.replace(/^https?:\/\/[^/]*/i, "").split(/[?#]/)[0];
  // ブラウザは `%2e%2e` を `..` に正規化するため、デコード後の segment も検査する
  return !pathPart
    .split("/")
    .some((segment) => segment === ".." || decodeSegment(segment) === "..");
}

export const iconUrlSchema = z
  .string()
  .max(2000)
  .refine(isSafeIconUrl, "invalid icon url")
  .nullable();
