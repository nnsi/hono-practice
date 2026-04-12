import { z } from "zod";

export const UpsertActivityRequestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  label: z.string().max(200),
  emoji: z.string().max(50),
  iconType: z.enum(["emoji", "upload", "generate"]),
  iconUrl: z.string().max(2000).nullable(),
  iconThumbnailUrl: z.string().max(2000).nullable(),
  description: z.string().max(1000),
  quantityUnit: z.string().max(50),
  orderIndex: z.string().max(200),
  showCombinedStats: z.boolean(),
  recordingMode: z.string().max(50).default("manual"),
  recordingModeConfig: z.string().max(10_000).nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export const UpsertActivityKindRequestSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid(),
  name: z.string().min(1).max(200),
  color: z.string().max(50).nullable(),
  orderIndex: z.string().max(200),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export const SyncActivitiesRequestSchema = z.object({
  activities: z.array(UpsertActivityRequestSchema).max(100),
  activityKinds: z.array(UpsertActivityKindRequestSchema).max(500),
});

export type UpsertActivityRequest = z.infer<typeof UpsertActivityRequestSchema>;
export type UpsertActivityKindRequest = z.infer<
  typeof UpsertActivityKindRequestSchema
>;
export type SyncActivitiesRequest = z.infer<typeof SyncActivitiesRequestSchema>;
