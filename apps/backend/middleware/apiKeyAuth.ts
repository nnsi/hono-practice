import type { Next } from "hono";

import { createUserId } from "../domain";
import { UnauthorizedError } from "../error";
import { newApiKeyRepository, newApiKeyUsecase } from "../feature/apiKey";

import type { HonoContext } from "../context";

export async function apiKeyAuthMiddleware(c: HonoContext, next: Next) {
  // Get token from Authorization header
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("unauthorized");
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!token) {
    throw new UnauthorizedError("unauthorized");
  }

  try {
    // APIキーの検証
    const db = c.env.DB;
    const apiKeyRepository = newApiKeyRepository(db);
    const apiKeyUsecase = newApiKeyUsecase(apiKeyRepository);

    const apiKey = await apiKeyUsecase.validateApiKey(token);

    if (!apiKey) {
      throw new UnauthorizedError("Invalid API key");
    }

    // コンテキストにユーザー情報を設定
    c.set("userId", createUserId(apiKey.userId));
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      throw e;
    }
    throw new UnauthorizedError("unauthorized");
  }

  await next();
}
