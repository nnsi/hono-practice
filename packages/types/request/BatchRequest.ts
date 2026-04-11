import { z } from "zod";

export const BatchRequestItemSchema = z.object({
  path: z.string().min(1),
});

export const BatchRequestSchema = z.array(BatchRequestItemSchema);

export type BatchRequest = z.infer<typeof BatchRequestSchema>;
