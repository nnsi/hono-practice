import { z } from "zod";

import { hasUniqueIds } from "./uniqueIds";

import { dateStringSchema } from "../../dateSchemas";
import { VALIDATION } from "../../validation";

export const UpsertActivityLogRequestSchema = z
  .object({
    id: z.string().uuid(),
    activityId: z.string().uuid(),
    activityKindId: z.string().uuid().nullable(),
    quantity: z.number().min(0).nullable(),
    memo: z.string().max(10_000),
    date: dateStringSchema,
    taskId: z.string().uuid().nullish(),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
      .nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    deletedAt: z.string().datetime().nullable(),
  })
  // v1 (`CreateActivityLogRequest`) と同じ上限。ただし削除 (deletedAt あり) は
  // 上限導入前に保存された legacy 値をそのまま持つ tombstone なので対象外にし、
  // 削除がサーバーに届かなくなるのを避ける。
  .superRefine((value, ctx) => {
    if (
      value.deletedAt === null &&
      value.quantity !== null &&
      value.quantity > VALIDATION.QUANTITY_MAX
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "validation:quantityMax999999",
      });
    }
  });

export const SyncActivityLogsRequestSchema = z.object({
  logs: z
    .array(UpsertActivityLogRequestSchema)
    .max(100)
    .refine(hasUniqueIds, "duplicate activity log ids"),
});

export type UpsertActivityLogRequest = z.infer<
  typeof UpsertActivityLogRequestSchema
>;
export type SyncActivityLogsRequest = z.infer<
  typeof SyncActivityLogsRequestSchema
>;
