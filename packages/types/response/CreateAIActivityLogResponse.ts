import { z } from "zod";

export const CreateAIActivityLogResponseSchema = z.object({
  activityLog: z.object({
    id: z.string(),
    date: z.coerce.string(),
    quantity: z.coerce.number().nullable(),
    memo: z.string(),
    activity: z.object({
      id: z.string(),
      name: z.string(),
    }),
    activityKind: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .nullish(),
  }),
  interpretation: z.object({
    detectedActivityName: z.string(),
    detectedKindName: z.string().nullable(),
    rawText: z.string(),
  }),
});

export type CreateAIActivityLogResponse = z.infer<
  typeof CreateAIActivityLogResponseSchema
>;
