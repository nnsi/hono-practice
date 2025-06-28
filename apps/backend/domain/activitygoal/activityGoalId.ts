import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const activityGoalIdSchema = z.string().uuid().brand<"ActivityGoalId">();
export type ActivityGoalId = z.infer<typeof activityGoalIdSchema>;

export function createActivityGoalId(id?: string): ActivityGoalId {
  const activityGoalId = id ?? v7();
  const parsedId = activityGoalIdSchema.safeParse(activityGoalId);

  if (!parsedId.success) {
    throw new DomainValidateError("createActivityGoalId: Invalid id");
  }

  return parsedId.data;
}

export function createActivityGoalIdFromString(id: string): ActivityGoalId {
  const result = activityGoalIdSchema.safeParse(id);
  if (!result.success) {
    throw new DomainValidateError("Invalid ActivityGoalId format");
  }
  return result.data;
}
