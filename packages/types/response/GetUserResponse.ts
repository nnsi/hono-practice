import { z } from "zod";

export const GetUserResponseSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  providers: z.array(z.string()),
});

export type GetUserResponse = z.infer<typeof GetUserResponseSchema>;
