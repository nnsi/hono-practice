import { z } from "zod";

export const contactRequestSchema = z.object({
  email: z.string().trim().email().min(1).max(254),
  category: z.enum(["bug_report", "account_deletion", "other"]).optional(),
  body: z.string().trim().min(1).max(1000),
});

export type ContactRequest = z.infer<typeof contactRequestSchema>;
