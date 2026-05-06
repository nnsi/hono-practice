import type { Context } from "hono";

import type { AppContext } from "../context";
import type { TracerSummary } from "../lib/tracer";
import { appendLocalLog } from "./localLogWriter";
import { firstStackFrame, writeToWAE } from "./waeWriter";

/** ボットスキャナーがよく叩くパスか判定（.env, .git, wp-admin 等） */
const BOT_SCAN_RE =
  /\.\w{1,10}$|\/\.git|\/wp-|\/cgi-bin|\/admin|\/phpmy|\/actuator/i;

export function isBotScanPath(path: string): boolean {
  return BOT_SCAN_RE.test(path);
}

/**
 * エラーレスポンスbodyからログ用エラー文字列を抽出する。
 *
 * PII漏洩防止: zod ZodError の issues は path + code のみに圧縮する。
 * message / received / expected にはユーザー入力値が混入しうるため除外。
 */
export async function extractErrorMsg(res: Response): Promise<string> {
  try {
    const body = await res.clone().json();
    const raw = body?.error ?? body?.message;
    if (!raw) return "";
    if (
      typeof raw === "object" &&
      Array.isArray((raw as { issues?: unknown }).issues)
    ) {
      const zodErr = raw as { issues: { path: unknown; code: unknown }[] };
      const compressed = zodErr.issues.map((i) => ({
        path: i.path,
        code: i.code,
      }));
      return JSON.stringify(compressed).slice(0, 500);
    }
    return JSON.stringify(raw).slice(0, 500);
  } catch {
    return "";
  }
}

const EMPTY_SUMMARY: TracerSummary = {
  dbMs: 0,
  r2Ms: 0,
  kvMs: 0,
  extMs: 0,
  spanCount: 0,
};

export function writeErrorToWAE(
  c: Context<AppContext>,
  opts: {
    requestId: string;
    method: string;
    path: string;
    errorMsg: string;
    duration: number;
    error: unknown;
  },
): void {
  try {
    const wae = c.env.WAE_LOGS;
    if (wae) {
      c.executionCtx.waitUntil(
        Promise.resolve(
          writeToWAE(wae, {
            level: "error",
            requestId: opts.requestId,
            method: opts.method,
            path: opts.path,
            error: opts.errorMsg,
            stackFrame:
              opts.error instanceof Error
                ? firstStackFrame((opts.error as Error).stack)
                : "",
            status: 500,
            duration: opts.duration,
            summary: EMPTY_SUMMARY,
          }),
        ),
      );
    } else {
      appendLocalLog({
        type: "request",
        level: "error",
        requestId: opts.requestId,
        method: opts.method,
        path: opts.path,
        error: opts.errorMsg,
        status: 500,
        duration: opts.duration,
      });
    }
  } catch {
    // WAE書き込み失敗はリクエスト処理に影響させない
  }
}

export function writeResponseToWAE(
  c: Context<AppContext>,
  opts: {
    requestId: string;
    method: string;
    path: string;
    level: string;
    status: number;
    duration: number;
    errorMsg: string;
    summary: TracerSummary;
    skipWae: boolean;
    waeWritten: boolean;
  },
): void {
  const {
    requestId,
    method,
    path,
    level,
    status,
    duration,
    errorMsg,
    summary,
    skipWae,
    waeWritten,
  } = opts;
  try {
    const wae = c.env.WAE_LOGS;
    if (wae && !skipWae && !waeWritten) {
      c.executionCtx.waitUntil(
        Promise.resolve(
          writeToWAE(wae, {
            level,
            requestId,
            method,
            path,
            error: errorMsg,
            status,
            duration,
            summary,
          }),
        ),
      );
    } else if (!waeWritten && !skipWae) {
      appendLocalLog({
        type: "request",
        level,
        requestId,
        method,
        path,
        status,
        duration,
        ...(errorMsg ? { error: errorMsg } : {}),
        ...summary,
      });
    }
  } catch {
    // WAE書き込み失敗はリクエスト処理に影響させない
  }
}
