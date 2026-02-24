import { z } from "zod";

export const CreateActivityRequestSchema = z.object({
  name: z.string().min(1, "タイトルは必須です").max(100),
  description: z.string().max(500).optional(),
  label: z.string().max(50).optional(),
  emoji: z.string().min(1, "絵文字は必須です").max(20),
  iconType: z.enum(["emoji", "upload", "generate"]).optional().default("emoji"),
  quantityUnit: z.string().min(1, "単位名は必須です").max(50),
  quantityOption: z.array(z.number()).optional(),
  showCombinedStats: z.boolean().optional(),
  kinds: z
    .array(z.object({ name: z.string().max(100), color: z.string().max(20).optional() }))
    .optional(),
});

export type CreateActivityRequest = z.infer<typeof CreateActivityRequestSchema>;
