import type { Context } from "hono";

import { z } from "zod";

/**
 * クライアントの「今日」を表す `clientDate` クエリパラメータ共通スキーマ。
 * YYYY-MM-DD 必須。サーバー側で「今日」を推測しないため、各エンドポイントは
 * clientDate を必須とする（未指定・不正は 400）。
 */
const clientDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const INVALID_CLIENT_DATE_MESSAGE =
  "Invalid or missing 'clientDate' parameter. Expected YYYY-MM-DD.";

type ParseClientDateResult =
  | { success: true; clientDate: string }
  | { success: false; response: Response };

/**
 * `clientDate` クエリを検証する。未指定・不正な場合は 400 レスポンスを返す。
 * 各 route は `if (!result.success) return result.response;` で early return する。
 */
export function parseClientDate(c: Context): ParseClientDateResult {
  const parsed = clientDateSchema.safeParse(c.req.query("clientDate"));
  if (!parsed.success) {
    return {
      success: false,
      response: c.json({ message: INVALID_CLIENT_DATE_MESSAGE }, 400),
    };
  }
  return { success: true, clientDate: parsed.data };
}
