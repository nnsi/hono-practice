import { and, eq, inArray, isNull } from "drizzle-orm";
import { Hono } from "hono";

import type { AppContext } from "../context";
import { activities, activityKinds } from "@infra/drizzle/schema";

export const activityV2Route = new Hono<AppContext>();

// activities 取得（activityKinds 含む）
activityV2Route.get("/activities", async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;

  const result = await db
    .select()
    .from(activities)
    .where(and(eq(activities.userId, userId), isNull(activities.deletedAt)))
    .orderBy(activities.orderIndex);

  const activityIds = result.map((a) => a.id);
  const kinds =
    activityIds.length > 0
      ? await db
          .select()
          .from(activityKinds)
          .where(
            and(
              inArray(activityKinds.activityId, activityIds),
              isNull(activityKinds.deletedAt),
            ),
          )
      : [];

  return c.json({ activities: result, activityKinds: kinds });
});
