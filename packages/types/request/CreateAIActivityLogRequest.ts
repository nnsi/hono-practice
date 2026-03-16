import { z } from "zod";

export const CreateAIActivityLogRequestSchema = z.object({
  speechText: z.string().min(1).max(1000),
});

export type CreateAIActivityLogRequest = z.infer<
  typeof CreateAIActivityLogRequestSchema
>;
