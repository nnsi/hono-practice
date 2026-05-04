import type { Context } from "hono";

import type { AppContext } from "@backend/context";

/**
 * リクエストが Web ブラウザ以外（モバイルアプリ・CLI など）から来ているかを判定する。
 *
 * 判定基準: `Origin` ヘッダの「ヘッダ自体が存在しない」こと。
 * - ブラウザの fetch は CORS 制約により Origin を必ず付与する。
 * - React Native / Expo の fetch、curl、Postman など非ブラウザクライアントは
 *   原則として Origin を付与しない。
 *
 * セキュリティ上、以下も Web 扱い（mobile=false）にする:
 * - `Origin: ""`（空文字列）— 仕様上ありえないが防御的に Web 扱い
 * - `Origin: null`（文字列リテラル "null"）— サンドボックス iframe や file:// 由来
 *
 * 制約:
 * - Capacitor や WebView 環境では Origin が付与されることがあり、その場合は
 *   Web 扱いとなる。これら環境への対応が必要になった時点で、明示的な
 *   `X-Client-Type: native` ヘッダ等への移行を検討する。
 *
 * 用途: refresh token を JSON ボディに含めるか（mobile=含める、web=cookie のみ）等。
 */
export function isMobileClient<E extends AppContext>(c: Context<E>): boolean {
  const origin = c.req.header("Origin");
  return origin === undefined;
}
