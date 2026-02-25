import { DomainValidateError } from "../errors";
import {
  ActivityKindSchema,
  ActivitySchema,
} from "../activity/activitySchema";
import { userIdSchema } from "../user/userSchema";
import { validateActivityLogDate } from "./activityLogValidation";
import { v7 } from "uuid";
import { z } from "zod";

// ActivityLogId
export const activityLogIdSchema = z
  .string()
  .uuid()
  .brand<"ActivityLogId">();
export type ActivityLogId = z.infer<typeof activityLogIdSchema>;

export function createActivityLogId(id?: string): ActivityLogId {
  const parsedId = activityLogIdSchema.safeParse(id ?? v7());
  if (!parsedId.success) {
    throw new DomainValidateError("createActivityLogId: Invalid id");
  }
  return parsedId.data;
}

// ActivityLog Entity
const BaseActivityLogSchema = z.object({
  id: activityLogIdSchema,
  userId: userIdSchema,
  activity: ActivitySchema,
  activityKind: z.union([ActivityKindSchema, z.null().optional()]),
  quantity: z.number().nullable(),
  memo: z.string().nullish(),
  date: z.preprocess((arg) => {
    if (arg instanceof Date) return arg.toISOString().split("T")[0];
    return arg;
  }, z.string()),
});

const NewActivityLogSchema = BaseActivityLogSchema.merge(
  z.object({
    type: z.literal("new"),
  }),
);

const PersistedActivityLogSchema = BaseActivityLogSchema.merge(
  z.object({
    type: z.literal("persisted"),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export const ActivityLogEntitySchema = z.discriminatedUnion("type", [
  NewActivityLogSchema,
  PersistedActivityLogSchema,
]);
export type ActivityLog = z.infer<typeof ActivityLogEntitySchema>;
export type ActivityLogInput = z.input<typeof ActivityLogEntitySchema>;

export function createActivityLogEntity(
  params: ActivityLogInput,
): ActivityLog {
  const parsedEntity = ActivityLogEntitySchema.safeParse(params);
  if (!parsedEntity.success) {
    throw new DomainValidateError(
      "createActivityLogEntity: invalid params",
    );
  }

  const activityLog = parsedEntity.data;

  // 日付の妥当性チェック（極端に古い日付を拒否）
  validateActivityLogDate(activityLog.date);

  if (activityLog.quantity !== null && activityLog.quantity < 0) {
    throw new DomainValidateError(
      "createActivityLogEntity: quantity cannot be negative",
    );
  }

  return activityLog;
}
