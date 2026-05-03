import { z } from "zod";

export const BatchRequestItemSchema = z.object({
  path: z.string().min(1).max(2048),
});

export const BatchRequestSchema = z.array(BatchRequestItemSchema).max(5);

export type BatchRequest = z.infer<typeof BatchRequestSchema>;
