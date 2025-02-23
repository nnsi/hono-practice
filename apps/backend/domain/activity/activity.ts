import { DomainValidateError } from "@backend/error";
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
  quantityUnit: z.string().nullable(),
  orderIndex: z.string().nullish(),
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
export type ActivityInput = z.input<typeof ActivitySchema>;

export function createActivityEntity(params: ActivityInput): Activity {
  const parsedEntity = ActivitySchema.safeParse(params);
  if (parsedEntity.error) {
    throw new DomainValidateError("createActivityEntity: invalid params");
  }

  return parsedEntity.data;
}
