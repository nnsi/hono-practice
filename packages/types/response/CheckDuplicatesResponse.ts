import { z } from "zod";

export const CheckDuplicatesResponseSchema = z.object({
  results: z.array(
    z.object({
      isDuplicate: z.boolean(),
      conflictingOperationIds: z.array(z.string()).optional(),
    })
  ),
});

export type CheckDuplicatesResponse = z.infer<typeof CheckDuplicatesResponseSchema>;