import { z } from "zod"

export const UpsertActivityRequestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  label: z.string(),
  emoji: z.string(),
  iconType: z.enum(["emoji", "upload", "generate"]),
  iconUrl: z.string().nullable(),
  iconThumbnailUrl: z.string().nullable(),
  description: z.string(),
  quantityUnit: z.string(),
  orderIndex: z.string(),
  showCombinedStats: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
})

export const UpsertActivityKindRequestSchema = z.object({
  id: z.string().uuid(),
  activityId: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().nullable(),
  orderIndex: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
})

export const SyncActivitiesRequestSchema = z.object({
  activities: z.array(UpsertActivityRequestSchema).max(100),
  activityKinds: z.array(UpsertActivityKindRequestSchema).max(500),
})

export type UpsertActivityRequest = z.infer<typeof UpsertActivityRequestSchema>
export type UpsertActivityKindRequest = z.infer<typeof UpsertActivityKindRequestSchema>
export type SyncActivitiesRequest = z.infer<typeof SyncActivitiesRequestSchema>
