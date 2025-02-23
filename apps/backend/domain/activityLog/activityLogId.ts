import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const activityLogIdSchema = z.string().uuid().brand<"ActivityLogId">();

export type ActivityLogId = z.infer<typeof activityLogIdSchema>;

export function createActivityLogId(id?: string): ActivityLogId {
  const parsedId = activityLogIdSchema.safeParse(id ?? v7());
  if (!parsedId.success) {
    throw new DomainValidateError("createActivityLogId: Invalid id");
  }
  return parsedId.data;
}
