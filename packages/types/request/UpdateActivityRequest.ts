import { RECORDING_MODES } from "@packages/domain/activity/recordingMode";
import { z } from "zod";

import { VALIDATION as V } from "../validation";

export const UpdateActivityRequestSchema = z.object({
  activity: z.object({
    name: z.string().max(V.ACTIVITY_NAME_MAX, "validation:max20Chars"),
    description: z.string().max(V.ACTIVITY_DESCRIPTION_MAX).optional(),
    quantityUnit: z.string().max(V.ACTIVITY_UNIT_MAX, "validation:max10Chars"),
    emoji: z
      .string()
      .min(1, "validation:emojiRequired")
      .max(V.ACTIVITY_EMOJI_MAX),
    iconType: z.enum(["emoji", "upload", "generate"]).optional(),
    recordingMode: z.enum(RECORDING_MODES).optional(),
    recordingModeConfig: z.string().nullable().optional(),
    showCombinedStats: z.boolean().optional(),
  }),
  kinds: z.array(
    z.object({
      id: z.string().max(100).optional(),
      name: z.string().max(V.KIND_NAME_MAX, "validation:max10Chars"),
      color: z.string().max(V.KIND_COLOR_MAX).optional(),
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
