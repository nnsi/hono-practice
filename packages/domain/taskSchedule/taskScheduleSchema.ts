import { v7 } from "uuid";
import { z } from "zod";

import { DomainValidateError } from "../errors";
import { userIdSchema } from "../user/userSchema";
import { taskScheduleDataSchema } from "./recurrenceSchema";

export const taskScheduleIdSchema = z.string().uuid().brand<"TaskScheduleId">();
export type TaskScheduleId = z.infer<typeof taskScheduleIdSchema>;
export function createTaskScheduleId(id?: string): TaskScheduleId {
  const result = taskScheduleIdSchema.safeParse(id ?? v7());
  if (!result.success)
    throw new DomainValidateError("createTaskScheduleId: Invalid id");
  return result.data;
}
const base = z.object({
  id: taskScheduleIdSchema,
  userId: userIdSchema,
  deletedAt: z.date().nullable().default(null),
});
export const TaskScheduleSchema = z
  .discriminatedUnion("type", [
    base.extend({ type: z.literal("new") }),
    base.extend({
      type: z.literal("persisted"),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),
  ])
  .and(taskScheduleDataSchema);
export type TaskSchedule = z.infer<typeof TaskScheduleSchema>;
export function createTaskScheduleEntity(
  params: z.input<typeof TaskScheduleSchema>,
): TaskSchedule {
  const result = TaskScheduleSchema.safeParse(params);
  if (!result.success)
    throw new DomainValidateError("createTaskScheduleEntity: invalid params");
  return result.data;
}
