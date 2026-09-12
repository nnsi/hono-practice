import type {
  AuthDiagnosticPayload,
  ClientErrorUsecase,
  StandardClientErrorPayload,
} from "./clientErrorUsecase";

export type ClientErrorRequestBody =
  | Omit<StandardClientErrorPayload, "userId">
  | Omit<AuthDiagnosticPayload, "userId">;

export type ClientErrorHandler = {
  recordClientError(
    body: ClientErrorRequestBody,
    userId: string | undefined,
  ): Promise<void>;
};

/**
 * route 層の入力（zod schema 検証済 body + auth context の userId）から
 * usecase 用の payload を組み立てる。
 *
 * userId は必ずサーバ側で付与する（クライアント送信値は信頼しない）。
 */
export function newClientErrorHandler(
  uc: ClientErrorUsecase,
): ClientErrorHandler {
  return {
    recordClientError: (body, userId) =>
      uc.recordClientError({ ...body, userId: userId ?? "" }),
  };
}
