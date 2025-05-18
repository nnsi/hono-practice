import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const userIdSchema = z.string().uuid().brand<"UserId">();

export type UserId = z.infer<typeof userIdSchema>;

export function createUserId(id?: string): UserId {
  const userId = id ?? v7();

  const parsedId = userIdSchema.safeParse(userId);
  if (!parsedId.success) {
    throw new DomainValidateError("createUserId: Invalid id");
  }

  return parsedId.data;
}
