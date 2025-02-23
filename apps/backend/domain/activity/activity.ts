import { z } from "zod";

import { userIdSchema } from "../user";

import { activityIdSchema } from "./activityId";
import { activityKindIdSchema } from "./activityKindId";

export const ActivityKindSchema = z.object({
  id: activityKindIdSchema,
  name: z.string(),
  orderIndex: z.string().nullish(),
});
export type ActivityKind = z.infer<typeof ActivityKindSchema>;

export const ActivityKindsSchema = z.array(ActivityKindSchema);

const BaseActivitySchema = z.object({
  id: activityIdSchema,
  userId: userIdSchema,
  name: z.string(),
  label: z.string().nullish(),
  emoji: z.string().nullish(),
  description: z.string().nullish(),
  quantityUnit: z.string(),
  orderIndex: z.string().optional(),
  kinds: z.array(ActivityKindSchema),
});

const NewActivitySchema = BaseActivitySchema.merge(
  z.object({
    type: z.literal("new"),
  }),
);

const PersistedActivitySchema = BaseActivitySchema.merge(
  z.object({
    type: z.literal("persisted"),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export const ActivitySchema = z.discriminatedUnion("type", [
  NewActivitySchema,
  PersistedActivitySchema,
]);
export type Activity = z.infer<typeof ActivitySchema>;
