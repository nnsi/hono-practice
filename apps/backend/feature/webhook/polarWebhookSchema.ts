import { z } from "zod";

export const polarSubscriptionSchema = z.object({
  id: z.string(),
  status: z.string(),
  current_period_start: z.string(),
  current_period_end: z.string(),
  cancel_at_period_end: z.boolean(),
  user: z.object({ id: z.string(), email: z.string() }),
  metadata: z.object({ userId: z.string().optional() }),
  product: z.object({ id: z.string(), name: z.string() }),
});

export const POLAR_SUBSCRIPTION_EVENTS = [
  "subscription.created",
  "subscription.updated",
  "subscription.active",
  "subscription.canceled",
  "subscription.revoked",
] as const;

export type PolarSubscriptionEvent = (typeof POLAR_SUBSCRIPTION_EVENTS)[number];

const polarSubscriptionEventSet = new Set<string>(POLAR_SUBSCRIPTION_EVENTS);
export function isPolarSubscriptionEvent(
  type: string,
): type is PolarSubscriptionEvent {
  return polarSubscriptionEventSet.has(type);
}

export const polarWebhookPayloadSchema = z.object({
  type: z.string(),
  data: polarSubscriptionSchema,
});
