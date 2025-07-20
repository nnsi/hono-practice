import { DomainValidateError } from "@backend/error";
import { z } from "zod";

import { ActivityKindSchema, ActivitySchema } from "../activity";
import { userIdSchema } from "../user";

import { activityLogIdSchema } from "./activityLogId";

const BaseActivityLogSchema = z.object({
  id: activityLogIdSchema,
  userId: userIdSchema,
  activity: ActivitySchema,
  activityKind: z.union([ActivityKindSchema, z.null().optional()]),
  quantity: z.number().nullable(),
  memo: z.string().nullish(),
  date: z.preprocess((arg) => {
    if ((arg as Date).toISOString)
      return (arg as Date).toISOString().split("T")[0];
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

export const ActivityLogSchema = z.discriminatedUnion("type", [
  NewActivityLogSchema,
  PersistedActivityLogSchema,
]);
export type ActivityLog = z.infer<typeof ActivityLogSchema>;
export type ActivityLogInput = z.input<typeof ActivityLogSchema>;

export function createActivityLogEntity(params: ActivityLogInput): ActivityLog {
  const parsedEntity = ActivityLogSchema.safeParse(params);
  if (!parsedEntity.success) {
    throw new DomainValidateError("createActivityLogEntity: invalid params");
  }

  const activityLog = parsedEntity.data;

  // 日付の妥当性チェック
  const date = new Date(activityLog.date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // 今日の終わりまでは許可

  // 未来の日付は許可しない
  if (date > today) {
    throw new DomainValidateError(
      "createActivityLogEntity: date cannot be in the future",
    );
  }

  // 極端に古い日付は許可しない（例：10年以上前）
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  if (date < tenYearsAgo) {
    throw new DomainValidateError(
      "createActivityLogEntity: date is too old (more than 10 years ago)",
    );
  }

  // 数量の妥当性チェック（nullでない場合）
  if (activityLog.quantity !== null && activityLog.quantity < 0) {
    throw new DomainValidateError(
      "createActivityLogEntity: quantity cannot be negative",
    );
  }

  return activityLog;
}
