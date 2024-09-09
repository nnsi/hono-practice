import { z } from "zod";

export const CreateActivityRequestSchema = z.object({
  name: z.string().min(1, "タイトルは必須です"),
  description: z.string().optional(),
  quantityOption: z.array(z.number()).optional(),
});

export type CreateActivityRequest = z.infer<typeof CreateActivityRequestSchema>;
