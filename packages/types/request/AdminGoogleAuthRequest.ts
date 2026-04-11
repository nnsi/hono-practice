import { z } from "zod";

export const AdminGoogleAuthRequestSchema = z.object({
  credential: z.string().min(1),
});

export type AdminGoogleAuthRequest = z.infer<
  typeof AdminGoogleAuthRequestSchema
>;
