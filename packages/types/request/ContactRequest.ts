import { z } from "zod";

import { VALIDATION as V } from "../validation";

export const contactRequestSchema = z.object({
  email: z.string().trim().email().min(1).max(V.CONTACT_EMAIL_MAX),
  category: z.enum(["bug_report", "account_deletion", "other"]).optional(),
  body: z.string().trim().min(1).max(V.CONTACT_BODY_MAX),
});

export type ContactRequest = z.infer<typeof contactRequestSchema>;
