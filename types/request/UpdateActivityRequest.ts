import { z } from "zod";

export const UpdateActivityRequestSchema = z.object({
  activity: z.object({
    name: z.string(),
    description: z.string().optional(),
    quantityLabel: z.string(),
  }),
  options: z.array(
    z.object({
      id: z.string().optional(),
      quantity: z.number(),
    })
  ),
  kinds: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
    })
  ),
});

export type UpdateActivityRequest = z.infer<typeof UpdateActivityRequestSchema>;