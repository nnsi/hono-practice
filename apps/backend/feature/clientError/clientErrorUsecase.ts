import type { Logger } from "@backend/lib/logger";
import { appendLocalLog } from "@backend/middleware/localLogWriter";
import { clipBytes } from "@backend/utils/clipBytes";
import type { AnalyticsEngineDataset } from "@cloudflare/workers-types";
import {
  type AuthDiagnosticReport,
  authDiagnosticReportSchema,
} from "@packages/types/authDiagnostics";

import { normalizeAuthEnvironment } from "../../lib/authDiagnostics";

// WAE blob は合計 5120 byte / 1 data point。各 blob のバイト上限を防御的に切る。
// route の zod schema (length max) と二重防衛: schema は UTF-16 length、
// ここは UTF-8 byte。CJK / 絵文字を含む長文ペイロードでも WAE 上限を超えないことを保証。
const MAX_MESSAGE_BYTES = 1000;
const MAX_STACK_BYTES = 3000;
const MAX_USERID_BYTES = 64;
const MAX_SCREEN_BYTES = 200;
const MAX_APP_VERSION_BYTES = 50;

export type StandardClientErrorPayload = {
  errorType:
    | "component_error"
    | "unhandled_error"
    | "network_error"
    | "db_query_error"
    | "storage_error";
  message: string;
  stack?: string;
  userId: string;
  screen?: string;
  platform: "ios" | "android" | "web";
  appVersion?: string;
};

export type AuthDiagnosticPayload = {
  errorType: "auth_diagnostic";
  message: "Auth session diagnostic";
  diagnostic: AuthDiagnosticReport;
  userId: string;
  platform: "ios" | "android" | "web";
  appVersion?: string;
};

export type ClientErrorPayload =
  | StandardClientErrorPayload
  | AuthDiagnosticPayload;

export type ClientErrorUsecase = {
  recordClientError(input: ClientErrorPayload): Promise<void>;
};

/**
 * クライアントから報告されたエラーを記録する。
 * 本番(Cloudflare): WAE Analytics Dataset に書き込む。
 * ローカル/テスト: logger + ファイルログに書き込む。
 */
export function newClientErrorUsecase(
  wae: AnalyticsEngineDataset | undefined,
  logger: Logger | undefined,
  environment?: string,
): ClientErrorUsecase {
  return {
    async recordClientError(input) {
      if (input.errorType === "auth_diagnostic") {
        // Revalidate at the persistence boundary: callers must never be able to
        // put credentials or arbitrary exception text into the diagnostic log.
        const parsed = authDiagnosticReportSchema.safeParse(input.diagnostic);
        if (!parsed.success) return;
        const sanitized = {
          errorType: "auth_diagnostic",
          message: "Auth session diagnostic",
          platform: input.platform,
          appVersion: /^[\w.+-]{1,50}$/.test(input.appVersion ?? "")
            ? input.appVersion
            : "",
          diagnostic: parsed.data,
          env: normalizeAuthEnvironment(environment),
        };
        try {
          if (wae) {
            wae.writeDataPoint({
              blobs: [
                sanitized.errorType,
                sanitized.message,
                "", // stack: auth diagnostics never store free text
                "", // userId: correlation uses request/flow IDs instead
                "", // screen: do not retain arbitrary URLs
                sanitized.platform,
                sanitized.appVersion ?? "",
                JSON.stringify(sanitized.diagnostic),
                sanitized.env,
              ],
              doubles: [1],
              indexes: [sanitized.errorType],
            });
          } else {
            logger?.info("Auth session diagnostic", sanitized);
            appendLocalLog({ type: "client_error", ...sanitized });
          }
        } catch {
          // Diagnostics are best effort and must not cause another auth failure.
        }
        return;
      }
      const sanitized = {
        ...input,
        message: clipBytes(input.message, MAX_MESSAGE_BYTES),
        stack: clipBytes(input.stack, MAX_STACK_BYTES),
        userId: clipBytes(input.userId, MAX_USERID_BYTES),
        screen: clipBytes(input.screen, MAX_SCREEN_BYTES),
        appVersion: clipBytes(input.appVersion, MAX_APP_VERSION_BYTES),
      };
      if (wae) {
        wae.writeDataPoint({
          blobs: [
            sanitized.errorType,
            sanitized.message,
            sanitized.stack,
            sanitized.userId,
            sanitized.screen,
            sanitized.platform,
            sanitized.appVersion,
          ],
          doubles: [1],
          indexes: [sanitized.errorType],
        });
        return;
      }
      logger?.info("Client error reported", sanitized);
      appendLocalLog({ type: "client_error", ...sanitized });
    },
  };
}
