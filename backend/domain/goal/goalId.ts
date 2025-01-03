import { v7, validate } from "uuid";

import { DomainValidateError } from "@/backend/error";

export type GoalId = string & { readonly __brand: unique symbol };

export function createGoalId(id?: string): GoalId {
  if (id && !validate(id)) {
    throw new DomainValidateError(`createGoalId: Invalid id : ${id}`);
  }

  const goalId = id ?? v7();

  return goalId as GoalId;
}
