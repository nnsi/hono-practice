import { z } from "zod";

export const UpdateActivityRequestSchema = z.object({
  activity: z.object({
    name: z.string().max(20, "validation:max20Chars"),
    description: z.string().max(500).optional(),
    quantityUnit: z.string().max(10, "validation:max10Chars"),
    emoji: z.string().min(1, "validation:emojiRequired").max(20),
    iconType: z.enum(["emoji", "upload", "generate"]).optional(),
    recordingMode: z.string().optional(),
    recordingModeConfig: z.string().nullable().optional(),
    showCombinedStats: z.boolean().optional(),
  }),
  kinds: z.array(
    z.object({
      id: z.string().max(100).optional(),
      name: z.string().max(10, "validation:max10Chars"),
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
