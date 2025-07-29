import { z } from "zod";

export const CreateActivityRequestSchema = z.object({
  name: z.string().min(1, "タイトルは必須です"),
  description: z.string().optional(),
  label: z.string().optional(),
  emoji: z.string().min(1, "絵文字は必須です"),
  iconType: z.enum(["emoji", "upload", "generate"]).optional().default("emoji"),
  quantityUnit: z.string().min(1, "単位名は必須です"),
  quantityOption: z.array(z.number()).optional(),
  showCombinedStats: z.boolean().optional(),
  kinds: z.array(z.object({ name: z.string() })).optional(),
});

export type CreateActivityRequest = z.infer<typeof CreateActivityRequestSchema>;
