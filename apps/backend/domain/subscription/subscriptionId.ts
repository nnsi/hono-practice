import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const subscriptionIdSchema = z.string().uuid().brand<"SubscriptionId">();

export type SubscriptionId = z.infer<typeof subscriptionIdSchema>;

export function createSubscriptionId(id?: string): SubscriptionId {
  const subscriptionId = id ?? v7();

  const parsedId = subscriptionIdSchema.safeParse(subscriptionId);
  if (!parsedId.success) {
    throw new DomainValidateError("createSubscriptionId: Invalid id");
  }

  return parsedId.data;
}
