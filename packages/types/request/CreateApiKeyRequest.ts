import { API_KEY_SCOPES } from "@packages/domain/apiKey/apiKeySchema";
import { z } from "zod";

import { VALIDATION as V } from "../validation";

export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(V.API_KEY_NAME_MAX),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1).default(["all"]),
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;
