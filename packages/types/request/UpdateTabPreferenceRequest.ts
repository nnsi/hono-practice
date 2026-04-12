import { tabPreferenceSchema } from "@packages/domain/user/tabPreferenceSchema";
import type { z } from "zod";

export const updateTabPreferenceRequestSchema = tabPreferenceSchema.pick({
  tabs: true,
  updatedAt: true,
});

export type UpdateTabPreferenceRequest = z.infer<
  typeof updateTabPreferenceRequestSchema
>;
