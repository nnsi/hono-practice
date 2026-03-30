import { API_KEY_SCOPES } from "@packages/domain/apiKey/apiKeySchema";
import { z } from "zod";

export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1).default(["all"]),
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;
