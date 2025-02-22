import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const UserIdSchema = z.string().uuid().brand<"UserId">();

export type UserId = z.infer<typeof UserIdSchema>;

export function createUserId(id?: string): UserId {
  const userId = id ?? v7();

  const parsedId = UserIdSchema.safeParse(userId);
  if (parsedId.error) {
    throw new DomainValidateError("createUserId: Invalid id");
  }

  return parsedId.data;
}
