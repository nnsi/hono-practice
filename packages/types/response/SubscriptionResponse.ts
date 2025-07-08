import { z } from "zod";

export const SubscriptionResponseSchema = z.object({
  plan: z.string(),
  status: z.string(),
  canUseApiKey: z.boolean(),
  trialEnd: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
});

export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;
