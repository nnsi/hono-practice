import { z } from "zod";

export const ApiKeyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(), // マスクされたキー（一覧取得時）または完全なキー（作成時のみ）
  lastUsedAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ApiKeyResponse = z.infer<typeof ApiKeyResponseSchema>;

export const GetApiKeysResponseSchema = z.object({
  apiKeys: z.array(ApiKeyResponseSchema),
});

export type GetApiKeysResponse = z.infer<typeof GetApiKeysResponseSchema>;

export const CreateApiKeyResponseSchema = z.object({
  apiKey: ApiKeyResponseSchema,
});

export type CreateApiKeyResponse = z.infer<typeof CreateApiKeyResponseSchema>;
