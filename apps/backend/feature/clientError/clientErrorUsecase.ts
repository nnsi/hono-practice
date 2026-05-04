import type { Logger } from "@backend/lib/logger";
import { appendLocalLog } from "@backend/middleware/localLogWriter";
import { clipBytes } from "@backend/utils/clipBytes";
import type { AnalyticsEngineDataset } from "@cloudflare/workers-types";

// WAE blob は合計 5120 byte / 1 data point。各 blob のバイト上限を防御的に切る。
// route の zod schema (length max) と二重防衛: schema は UTF-16 length、
// ここは UTF-8 byte。CJK / 絵文字を含む長文ペイロードでも WAE 上限を超えないことを保証。
const MAX_MESSAGE_BYTES = 1000;
const MAX_STACK_BYTES = 3000;
const MAX_USERID_BYTES = 64;
const MAX_SCREEN_BYTES = 200;
const MAX_APP_VERSION_BYTES = 50;

export type ClientErrorPayload = {
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
): ClientErrorUsecase {
  return {
    async recordClientError(input) {
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
