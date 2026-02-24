import { z } from "zod";

export const CheckDuplicatesRequestSchema = z.object({
  operations: z.array(
    z.object({
      entityType: z.string().max(50),
      entityId: z.string().max(100),
      timestamp: z.string().max(50),
      operation: z.enum(["create", "update", "delete"]),
    }),
  ),
});

export type CheckDuplicatesRequest = z.infer<
  typeof CheckDuplicatesRequestSchema
>;
