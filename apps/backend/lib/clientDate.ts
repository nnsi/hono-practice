import type { Context } from "hono";

import { dateStringSchema } from "@packages/types/dateSchemas";

import dayjs from "./dayjs";

/**
 * クライアントの「今日」を表す `clientDate` クエリパラメータ共通スキーマ。
 * YYYY-MM-DD 必須。サーバー側で「今日」を推測しないため、各エンドポイントは
 * clientDate を必須とする（未指定・不正は 400）。
 */
const MAX_CLIENT_DATE_AHEAD_DAYS = 2;

const INVALID_CLIENT_DATE_MESSAGE =
  "Invalid or missing 'clientDate' parameter. Expected YYYY-MM-DD.";

type ParseClientDateResult =
  | { success: true; clientDate: string }
  | { success: false; response: Response };

/**
 * `clientDate` クエリを検証する。未指定・不正な場合は 400 レスポンスを返す。
 * 各 route は `if (!result.success) return result.response;` で early return する。
 */
export function parseClientDate(
  c: Context,
  now: Date = new Date(),
): ParseClientDateResult {
  const parsed = dateStringSchema.safeParse(c.req.query("clientDate"));
  const maxClientDate = new Date(now);
  maxClientDate.setUTCDate(
    maxClientDate.getUTCDate() + MAX_CLIENT_DATE_AHEAD_DAYS,
  );
  const maxClientDateString = dayjs(maxClientDate).format("YYYY-MM-DD");

  if (!parsed.success || parsed.data > maxClientDateString) {
    return {
      success: false,
      response: c.json({ message: INVALID_CLIENT_DATE_MESSAGE }, 400),
    };
  }
  return { success: true, clientDate: parsed.data };
}
