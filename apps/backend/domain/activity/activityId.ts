import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const activityIdSchema = z.string().uuid().brand<"ActivityId">();

export type ActivityId = z.infer<typeof activityIdSchema>;

export function createActivityId(id?: string): ActivityId {
  const parsedId = activityIdSchema.safeParse(id ?? v7());
  if (!parsedId.success) {
    throw new DomainValidateError("createActivityId: Invalid id");
  }
  return parsedId.data;
}
