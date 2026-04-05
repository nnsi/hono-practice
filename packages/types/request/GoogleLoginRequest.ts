import { z } from "zod";

import { consentsSchema } from "./ConsentsRequest";

export const googleLoginRequestSchema = z.object({
  credential: z.string().max(4096), // Google IDトークン
  /** 新規ユーザー登録時のみ送信。既存ユーザーのログインでは省略可。 */
  consents: consentsSchema.optional(),
});

export type GoogleLoginRequest = z.infer<typeof googleLoginRequestSchema>;
