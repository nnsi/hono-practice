import { z } from "zod";

export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(255),
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;
