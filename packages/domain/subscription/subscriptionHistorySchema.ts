import { v7 } from "uuid";
import { z } from "zod";

import { DomainValidateError } from "../errors";
import type { SubscriptionId } from "./subscriptionSchema";

export const subscriptionHistoryIdSchema = z
  .string()
  .uuid()
  .brand<"SubscriptionHistoryId">();

export type SubscriptionHistoryId = z.infer<typeof subscriptionHistoryIdSchema>;

export function createSubscriptionHistoryId(
  id?: string,
): SubscriptionHistoryId {
  const historyId = id ?? v7();
  const parsed = subscriptionHistoryIdSchema.safeParse(historyId);
  if (!parsed.success) {
    throw new DomainValidateError("createSubscriptionHistoryId: Invalid id");
  }
  return parsed.data;
}

type SubscriptionHistoryData = {
  id: SubscriptionHistoryId;
  subscriptionId: SubscriptionId;
  eventType: string;
  plan: "free" | "premium";
  status: "trial" | "active" | "paused" | "cancelled" | "expired";
  source: string;
  webhookId: string | null;
  createdAt: Date;
};

export type SubscriptionHistory = SubscriptionHistoryData;

export function newSubscriptionHistory(
  params: SubscriptionHistoryData,
): SubscriptionHistory {
  return { ...params };
}
