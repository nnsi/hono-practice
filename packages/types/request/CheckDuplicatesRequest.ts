import { z } from "zod";

export const CheckDuplicatesRequestSchema = z.object({
  operations: z.array(
    z.object({
      entityType: z.string(),
      entityId: z.string(),
      timestamp: z.string(),
      operation: z.enum(["create", "update", "delete"]),
    }),
  ),
});

export type CheckDuplicatesRequest = z.infer<
  typeof CheckDuplicatesRequestSchema
>;
