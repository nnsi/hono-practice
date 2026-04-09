import { RECORDING_MODES } from "@packages/domain/activity/recordingMode";
import { z } from "zod";

import { VALIDATION as V } from "../validation";

export const CreateActivityRequestSchema = z.object({
  name: z
    .string()
    .min(1, "validation:titleRequired")
    .max(V.ACTIVITY_NAME_MAX, "validation:max20Chars"),
  description: z.string().max(V.ACTIVITY_DESCRIPTION_MAX).optional(),
  label: z.string().max(V.ACTIVITY_LABEL_MAX).optional(),
  emoji: z
    .string()
    .min(1, "validation:emojiRequired")
    .max(V.ACTIVITY_EMOJI_MAX),
  iconType: z.enum(["emoji", "upload", "generate"]).optional().default("emoji"),
  quantityUnit: z
    .string()
    .min(1, "validation:unitRequired")
    .max(V.ACTIVITY_UNIT_MAX, "validation:max10Chars"),
  recordingMode: z.enum(RECORDING_MODES).optional().default("manual"),
  recordingModeConfig: z.string().nullable().optional(),
  showCombinedStats: z.boolean().optional(),
  kinds: z
    .array(
      z.object({
        name: z.string().max(V.KIND_NAME_MAX, "validation:max10Chars"),
        color: z.string().max(V.KIND_COLOR_MAX).optional(),
      }),
    )
    .optional(),
});

export type CreateActivityRequest = z.infer<typeof CreateActivityRequestSchema>;
