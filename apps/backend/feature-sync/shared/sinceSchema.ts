import type { Context } from "hono";

import { z } from "zod";

/**
 * sync route の `since` クエリパラメータ共通スキーマ。
 * ISO 8601 datetime（省略可）。
 */
const sinceSchema = z.string().datetime().optional();

const INVALID_SINCE_MESSAGE =
  "Invalid 'since' parameter. Expected ISO 8601 datetime.";

type ParseSinceResult =
  | { success: true; since: string | undefined }
  | { success: false; response: Response };

/**
 * `since` クエリを検証する。不正な場合は 400 レスポンスを返す。
 * 各 sync route は `if (!result.success) return result.response;` で early return する。
 */
export function parseSince(c: Context): ParseSinceResult {
  const parsed = sinceSchema.safeParse(c.req.query("since") || undefined);
  if (!parsed.success) {
    return {
      success: false,
      response: c.json({ message: INVALID_SINCE_MESSAGE }, 400),
    };
  }
  return { success: true, since: parsed.data };
}
