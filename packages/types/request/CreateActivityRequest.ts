import { z } from "zod";

export const CreateActivityRequestSchema = z.object({
  name: z
    .string()
    .min(1, "validation:titleRequired")
    .max(20, "validation:max20Chars"),
  description: z.string().max(500).optional(),
  label: z.string().max(50).optional(),
  emoji: z.string().min(1, "validation:emojiRequired").max(20),
  iconType: z.enum(["emoji", "upload", "generate"]).optional().default("emoji"),
  quantityUnit: z
    .string()
    .min(1, "validation:unitRequired")
    .max(10, "validation:max10Chars"),
  recordingMode: z.string().optional().default("manual"),
  recordingModeConfig: z.string().nullable().optional(),
  showCombinedStats: z.boolean().optional(),
  kinds: z
    .array(
      z.object({
        name: z.string().max(10, "validation:max10Chars"),
        color: z.string().max(20).optional(),
      }),
    )
    .optional(),
});

export type CreateActivityRequest = z.infer<typeof CreateActivityRequestSchema>;
