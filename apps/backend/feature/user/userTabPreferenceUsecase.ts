import { AppError } from "@backend/error";
import type { Tracer } from "@backend/lib/tracer";
import type { TabPreference } from "@packages/domain/user/tabPreferenceSchema";
import type { UserId } from "@packages/domain/user/userSchema";

import type { UserRepository } from "./userRepository";

export function getTabPreference(repo: UserRepository, tracer: Tracer) {
  return async (userId: UserId): Promise<TabPreference> => {
    const result = await tracer.span("db.getTabPreference", () =>
      repo.getTabPreference(userId),
    );

    if (!result) {
      throw new AppError("user not found", 404);
    }

    return result;
  };
}

export function updateTabPreference(repo: UserRepository, tracer: Tracer) {
  return async (
    userId: UserId,
    preference: TabPreference,
  ): Promise<TabPreference> => {
    const result = await tracer.span("db.saveTabPreference", () =>
      repo.saveTabPreference(userId, preference),
    );

    if (!result) {
      throw new AppError("user not found", 404);
    }

    return result;
  };
}
