import { DomainValidateError } from "@backend/error";
import { z } from "zod";

import { userIdSchema } from "./userId";

const BaseUserSchema = z.object({
  id: userIdSchema,
  name: z.string().max(100, "Name must be 100 characters or less").nullish(),
  loginId: z
    .string()
    .min(1, "Login ID must be at least 1 character")
    .max(100, "Login ID must be 100 characters or less"),
  password: z.string().nullable(),
});

const NewUserSchema = BaseUserSchema.merge(
  z.object({
    type: z.literal("new"),
  }),
);

const PersistedUserSchema = BaseUserSchema.merge(
  z.object({
    type: z.literal("persisted"),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
);

export const UserSchema = z.discriminatedUnion("type", [
  NewUserSchema,
  PersistedUserSchema,
]);
export type User = z.infer<typeof UserSchema>;
export type UserInput = z.input<typeof UserSchema>;

export function createUserEntity(params: UserInput): User {
  const parsedEntity = UserSchema.safeParse(params);
  if (!parsedEntity.success) {
    throw new DomainValidateError("createUserEntity: invalid params");
  }

  const user = parsedEntity.data;

  // パスワードが設定されている場合の強度チェック
  if (user.password !== null) {
    if (user.password.length < 8) {
      throw new DomainValidateError(
        "createUserEntity: password must be at least 8 characters long",
      );
    }

    // パスワードの複雑さチェック（少なくとも1つの数字と1つの文字を含む）
    if (!/(?=.*[0-9])(?=.*[a-zA-Z])/.test(user.password)) {
      throw new DomainValidateError(
        "createUserEntity: password must contain at least one letter and one number",
      );
    }
  }

  return user;
}
