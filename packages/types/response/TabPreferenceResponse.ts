import { tabPreferenceSchema } from "@packages/domain/user/tabPreferenceSchema";
import type { z } from "zod";

export const TabPreferenceResponseSchema = tabPreferenceSchema;

export type TabPreferenceResponse = z.infer<typeof TabPreferenceResponseSchema>;
