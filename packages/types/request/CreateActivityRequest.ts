import { z } from "zod";

export const CreateActivityRequestSchema = z.object({
  name: z.string().min(1, "タイトルは必須です"),
  description: z.string().optional(),
  label: z.string().optional(),
  emoji: z.string().optional(),
  quantityUnit: z.string().min(1, "単位名は必須です"),
  quantityOption: z.array(z.number()).optional(),
});

export type CreateActivityRequest = z.infer<typeof CreateActivityRequestSchema>;
