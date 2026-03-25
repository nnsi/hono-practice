import { z } from "zod";

export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(255),
  scope: z.enum(["all", "voice"]).default("all"),
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;
