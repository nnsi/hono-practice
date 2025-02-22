import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

const goalIdSchema = z.string().uuid();

export type GoalId = z.infer<typeof goalIdSchema>;

export function createGoalId(id?: string): GoalId {
  const parsedId = goalIdSchema.safeParse(id ?? v7());
  if (!parsedId.success) {
    throw new DomainValidateError(`createGoalId: Invalid id : ${id}`);
  }
  return parsedId.data;
}
