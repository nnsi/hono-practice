import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import { users } from "@infra/drizzle/schema";
import {
  type TabPreference,
  coerceTabPreference,
} from "@packages/domain/user/tabPreferenceSchema";
import type { UserId } from "@packages/domain/user/userSchema";
import { and, eq, isNull, lt } from "drizzle-orm";

export function getTabPreference(db: QueryExecutor) {
  return async (userId: UserId): Promise<TabPreference | undefined> => {
    const [result] = await db
      .select({
        tabs: users.tabPreferences,
        updatedAt: users.tabPreferencesUpdatedAt,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!result) {
      return undefined;
    }

    return coerceTabPreference({
      tabs: result.tabs,
      updatedAt: result.updatedAt.toISOString(),
    });
  };
}

export function saveTabPreference(db: QueryExecutor) {
  const getCurrentPreference = getTabPreference(db);

  return async (
    userId: UserId,
    preference: TabPreference,
  ): Promise<TabPreference | undefined> => {
    const nextUpdatedAt = new Date(preference.updatedAt);
    const [result] = await db
      .update(users)
      .set({
        tabPreferences: preference.tabs,
        tabPreferencesUpdatedAt: nextUpdatedAt,
      })
      .where(
        and(
          eq(users.id, userId),
          isNull(users.deletedAt),
          lt(users.tabPreferencesUpdatedAt, nextUpdatedAt),
        ),
      )
      .returning();

    if (!result) {
      return getCurrentPreference(userId);
    }

    return coerceTabPreference({
      tabs: result.tabPreferences,
      updatedAt: result.tabPreferencesUpdatedAt.toISOString(),
    });
  };
}
