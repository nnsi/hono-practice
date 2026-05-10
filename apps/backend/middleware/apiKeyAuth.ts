import type { Next } from "hono";

import { createUserId } from "@packages/domain/user/userSchema";

import type { HonoContext } from "../context";
import { UnauthorizedError } from "../error";
import { newApiKeyRepository, newApiKeyUsecase } from "../feature/apiKey";
import { newSubscriptionRepository } from "../feature/subscription/subscriptionRepository";
import { newUserRepository } from "../feature/user";
import { noopLogger } from "../lib/logger";
import { noopTracer } from "../lib/tracer";

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
    const tracer = c.get("tracer") ?? noopTracer;
    const logger = c.get("logger") ?? noopLogger;
    const apiKeyUsecase = newApiKeyUsecase(apiKeyRepository, tracer, logger);

    const apiKey = await apiKeyUsecase.validateApiKey(token);

    if (!apiKey) {
      throw new UnauthorizedError("Invalid API key");
    }

    const userId = createUserId(apiKey.userId);
    const userRepository = newUserRepository(db);
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new UnauthorizedError("Invalid API key");
    }

    const subscriptionRepository = newSubscriptionRepository(db);
    const subscription =
      await subscriptionRepository.findSubscriptionByUserId(userId);
    if (!subscription?.canUseApiKey()) {
      throw new UnauthorizedError("Premium subscription required");
    }

    // コンテキストにユーザー情報とスコープを設定
    c.set("userId", userId);
    c.set("apiKeyScopes", apiKey.scopes);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      throw e;
    }
    throw new UnauthorizedError("unauthorized");
  }

  await next();
}
