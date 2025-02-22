import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const ActivityIdSchema = z.string().uuid().brand<"ActivityId">();

export type ActivityId = z.infer<typeof ActivityIdSchema>;

export function createActivityId(id?: string): ActivityId {
  const parsedId = ActivityIdSchema.safeParse(id ?? v7());
  if (!parsedId.success) {
    throw new DomainValidateError("createActivityId: Invalid id");
  }
  return parsedId.data;
}
