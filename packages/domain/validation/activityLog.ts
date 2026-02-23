import { z } from "zod"

export const ActivityLogSchema = z.object({
  quantity: z.number().min(0).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memo: z.string().default(""),
})
