import { DomainValidateError } from "@backend/error";
import { v7 } from "uuid";
import { z } from "zod";

export const apiKeyIdSchema = z.string().uuid().brand<"ApiKeyId">();

export type ApiKeyId = z.infer<typeof apiKeyIdSchema>;

export function createApiKeyId(id?: string): ApiKeyId {
  const apiKeyId = id ?? v7();

  const parsedId = apiKeyIdSchema.safeParse(apiKeyId);
  if (!parsedId.success) {
    throw new DomainValidateError("createApiKeyId: Invalid id");
  }

  return parsedId.data;
}
