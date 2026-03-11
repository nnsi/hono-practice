import { z } from "zod";

const ActivityRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  label: z.string().nullable(),
  emoji: z.string().nullable(),
  iconType: z.enum(["emoji", "upload", "generate"]),
  iconUrl: z.string().nullable(),
  iconThumbnailUrl: z.string().nullable(),
  description: z.string().nullable(),
  quantityUnit: z.string().nullable(),
  orderIndex: z.string().nullable(),
  showCombinedStats: z.boolean(),
  recordingMode: z.string().nullable(),
  recordingModeConfig: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

const ActivityKindRowSchema = z.object({
  id: z.string(),
  activityId: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  orderIndex: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

const SyncResultSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    syncedIds: z.array(z.string()),
    serverWins: z.array(itemSchema),
    skippedIds: z.array(z.string()),
  });

export const GetActivitiesV2ResponseSchema = z.object({
  activities: z.array(ActivityRowSchema),
  activityKinds: z.array(ActivityKindRowSchema),
});

export const SyncActivitiesV2ResponseSchema = z.object({
  activities: SyncResultSchema(ActivityRowSchema),
  activityKinds: SyncResultSchema(ActivityKindRowSchema),
});

export type SyncActivitiesResponse = z.infer<
  typeof SyncActivitiesV2ResponseSchema
>;

export type GetActivitiesV2Response = z.infer<
  typeof GetActivitiesV2ResponseSchema
>;
