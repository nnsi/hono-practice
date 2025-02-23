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
  }, z.string().date()),
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
