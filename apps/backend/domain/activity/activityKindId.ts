import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const ActivityKindIdSchema = z.string().uuid().brand<"ActivityKindId">();

export type ActivityKindId = z.infer<typeof ActivityKindIdSchema>;

export function createActivityKindId(id?: string): ActivityKindId {
  const parsedId = ActivityKindIdSchema.safeParse(id ?? v7());
  if (!parsedId.success) {
    throw new DomainValidateError("createActivityKindId: Invalid id");
  }
  return parsedId.data;
}
