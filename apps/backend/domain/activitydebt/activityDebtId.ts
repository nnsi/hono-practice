import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const activityDebtIdSchema = z.string().uuid().brand<"ActivityDebtId">();
export type ActivityDebtId = z.infer<typeof activityDebtIdSchema>;

export function createActivityDebtId(): ActivityDebtId {
  return v7() as ActivityDebtId;
}

export function createActivityDebtIdFromString(id: string): ActivityDebtId {
  const result = activityDebtIdSchema.safeParse(id);
  if (!result.success) {
    throw new DomainValidateError("Invalid ActivityDebtId format");
  }
  return result.data;
}
