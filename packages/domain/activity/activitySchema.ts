import { DomainValidateError } from "../errors";
import { userIdSchema } from "../user/userSchema";
import { v7 } from "uuid";
import { z } from "zod";

// ActivityId
export const activityIdSchema = z.string().uuid().brand<"ActivityId">();
export type ActivityId = z.infer<typeof activityIdSchema>;

export function createActivityId(id?: string): ActivityId {
  const parsedId = activityIdSchema.safeParse(id ?? v7());
  if (!parsedId.success) {
    throw new DomainValidateError("createActivityId: Invalid id");
  }
  return parsedId.data;
}

// ActivityKindId
export const activityKindIdSchema = z
  .string()
  .uuid()
  .brand<"ActivityKindId">();
export type ActivityKindId = z.infer<typeof activityKindIdSchema>;

export function createActivityKindId(id?: string): ActivityKindId {
  const parsedId = activityKindIdSchema.safeParse(id ?? v7());
  if (!parsedId.success) {
    throw new DomainValidateError("createActivityKindId: Invalid id");
  }
  return parsedId.data;
}

// ActivityKind
export const ActivityKindSchema = z.object({
  id: activityKindIdSchema,
  name: z.string(),
  color: z.string().nullish(),
  orderIndex: z.string().nullish(),
});
export type ActivityKind = z.infer<typeof ActivityKindSchema>;

export const ActivityKindsSchema = z.array(ActivityKindSchema);

// IconType
export const iconTypeSchema = z.enum(["emoji", "upload", "generate"]);
export type IconType = z.infer<typeof iconTypeSchema>;

// Activity
const BaseActivitySchema = z.object({
  id: activityIdSchema,
  userId: userIdSchema,
  name: z.string(),
  label: z.string().nullish(),
  emoji: z.string().nullish(),
  iconType: iconTypeSchema,
  iconUrl: z.string().nullish(),
  iconThumbnailUrl: z.string().nullish(),
  description: z.string().nullish(),
  quantityUnit: z.string().nullable(),
  orderIndex: z.string().nullish(),
  kinds: z.array(ActivityKindSchema),
  showCombinedStats: z.boolean(),
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
  if (!parsedEntity.success) {
    throw new DomainValidateError("createActivityEntity: invalid params");
  }

  return parsedEntity.data;
}
