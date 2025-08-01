import { z } from "zod";

export const UpdateActivityRequestSchema = z.object({
  activity: z.object({
    name: z.string(),
    description: z.string().optional(),
    quantityUnit: z.string(),
    emoji: z.string().min(1, "絵文字は必須です"),
    iconType: z.enum(["emoji", "upload", "generate"]).optional(),
    showCombinedStats: z.boolean().optional(),
  }),
  kinds: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
    }),
  ),
});

export const UpdateActivityOrderRequestSchema = z.object({
  prev: z.string().optional(),
  next: z.string().optional(),
  current: z.string(),
});

export type UpdateActivityRequest = z.infer<typeof UpdateActivityRequestSchema>;

export type UpdateActivityOrderRequest = z.infer<
  typeof UpdateActivityOrderRequestSchema
>;
