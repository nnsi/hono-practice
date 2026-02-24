import { z } from "zod";

export const UpdateActivityRequestSchema = z.object({
  activity: z.object({
    name: z.string().max(100),
    description: z.string().max(500).optional(),
    quantityUnit: z.string().max(50),
    emoji: z.string().min(1, "絵文字は必須です").max(20),
    iconType: z.enum(["emoji", "upload", "generate"]).optional(),
    showCombinedStats: z.boolean().optional(),
  }),
  kinds: z.array(
    z.object({
      id: z.string().max(100).optional(),
      name: z.string().max(100),
      color: z.string().max(20).optional(),
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
