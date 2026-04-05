import { z } from "zod";

import { consentsSchema } from "./ConsentsRequest";

export const appleLoginRequestSchema = z.object({
  credential: z.string().max(8192), // Apple IDトークン
  /** 新規ユーザー登録時のみ送信。既存ユーザーのログインでは省略可。 */
  consents: consentsSchema.optional(),
});

export type AppleLoginRequest = z.infer<typeof appleLoginRequestSchema>;
